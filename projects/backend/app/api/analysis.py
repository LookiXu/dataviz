"""
数据分析 API
提供雷达图、词云等分析接口
"""
from flask import Blueprint, request, jsonify
import asyncio
from collections import Counter
import jieba
import re
from typing import List, Dict, Any

from app.core.database import prisma

analysis_bp = Blueprint('analysis', __name__, url_prefix='/api/analysis')


@analysis_bp.route('/comparison', methods=['GET'])
def get_comparison_data():
    """
    获取多主播横向对比的雷达图数据
    
    查询参数:
    - start_date: 开始日期 (YYYY-MM-DD)
    - end_date: 结束日期 (YYYY-MM-DD)
    - hosts: 主播列表（可选，逗号分隔）
    
    返回:
    - dimensions: 雷达图维度
    - series: 各主播数据系列
    """
    try:
        # 获取查询参数
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        hosts_param = request.args.get('hosts', '')
        
        async def fetch_data():
            await prisma.connect()
            try:
                # 构建查询条件
                where_clause = {}
                if start_date and end_date:
                    where_clause['liveDate'] = {
                        'gte': start_date,
                        'lte': end_date
                    }
                
                if hosts_param:
                    host_list = hosts_param.split(',')
                    where_clause['hostName'] = {'in': host_list}
                
                # 查询直播记录
                records = await prisma.liverecord.find_many(
                    where=where_clause,
                    order={'liveDate': 'desc'}
                )
                return records
            finally:
                await prisma.disconnect()
        
        records = asyncio.run(fetch_data())
        
        if not records:
            return jsonify({
                'success': True,
                'data': {
                    'dimensions': [],
                    'series': []
                }
            })
        
        # 按主播分组聚合数据
        host_data: Dict[str, Dict[str, List[float]]] = {}
        for record in records:
            host = record.hostName
            if host not in host_data:
                host_data[host] = {
                    'interaction_rate': [],
                    'share_rate': [],
                    'follow_rate': [],
                    'wechat_add_rate': [],
                    'avg_watch_duration': [],
                    'reservation_rate': []
                }
            
            host_data[host]['interaction_rate'].append(record.interactionRate)
            host_data[host]['share_rate'].append(record.shareRate)
            host_data[host]['follow_rate'].append(record.followRate)
            host_data[host]['wechat_add_rate'].append(record.wechatAddRate)
            host_data[host]['avg_watch_duration'].append(record.avgWatchDuration)
            host_data[host]['reservation_rate'].append(record.reservationRate)
        
        # 计算各主播平均值
        radar_dimensions = [
            {'name': '互动率', 'max': 100},
            {'name': '分享率', 'max': 100},
            {'name': '关注率', 'max': 100},
            {'name': '加微率', 'max': 100},
            {'name': '人均观看时长', 'max': 60},
            {'name': '预约转化率', 'max': 100}
        ]
        
        series = []
        colors = ['#8B5CF6', '#0D9488', '#F59E0B', '#EF4444', '#3B82F6']
        
        for idx, (host, metrics) in enumerate(host_data.items()):
            values = [
                round(sum(metrics['interaction_rate']) / len(metrics['interaction_rate']), 2),
                round(sum(metrics['share_rate']) / len(metrics['share_rate']), 2),
                round(sum(metrics['follow_rate']) / len(metrics['follow_rate']), 2),
                round(sum(metrics['wechat_add_rate']) / len(metrics['wechat_add_rate']), 2),
                round(sum(metrics['avg_watch_duration']) / len(metrics['avg_watch_duration']), 2),
                round(sum(metrics['reservation_rate']) / len(metrics['reservation_rate']), 2)
            ]
            
            series.append({
                'name': host,
                'value': values,
                'itemStyle': {'color': colors[idx % len(colors)]}
            })
        
        return jsonify({
            'success': True,
            'data': {
                'dimensions': radar_dimensions,
                'series': series
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'获取对比数据失败: {str(e)}'
        }), 500


@analysis_bp.route('/wordcloud', methods=['GET'])
def get_wordcloud_data():
    """
    提取学员评价词云数据
    
    查询参数:
    - course_name: 课程名称（可选）
    - instructor_name: 讲师姓名（可选）
    - limit: 返回词数量限制（默认 50）
    
    返回:
    - words: 词云数据列表 [{name: 词, value: 权重}]
    """
    try:
        # 获取查询参数
        course_name = request.args.get('course_name')
        instructor_name = request.args.get('instructor_name')
        limit = int(request.args.get('limit', 50))
        
        async def fetch_feedback():
            await prisma.connect()
            try:
                # 构建查询条件
                where_clause = {}
                if course_name:
                    where_clause['courseName'] = course_name
                if instructor_name:
                    where_clause['instructorName'] = instructor_name
                
                feedbacks = await prisma.coursefeedback.find_many(
                    where=where_clause if where_clause else None
                )
                return feedbacks
            finally:
                await prisma.disconnect()
        
        feedbacks = asyncio.run(fetch_feedback())
        
        if not feedbacks:
            return jsonify({
                'success': True,
                'data': {
                    'words': []
                }
            })
        
        # 合并所有评价文本
        all_reviews = ' '.join([f.studentReview for f in feedbacks])
        
        # 分词并统计
        words = extract_keywords(all_reviews, limit)
        
        return jsonify({
            'success': True,
            'data': {
                'words': words,
                'total_reviews': len(feedbacks)
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'获取词云数据失败: {str(e)}'
        }), 500


def extract_keywords(text: str, limit: int = 50) -> List[Dict[str, Any]]:
    """
    从文本中提取关键词
    
    Args:
        text: 原始文本
        limit: 返回词数量
        
    Returns:
        List[Dict]: 词频列表
    """
    # 加载停用词
    stop_words = set([
        '的', '了', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也',
        '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这',
        '那', '这些', '那些', '这个', '那个', '之', '与', '及', '等', '或', '但是', '但',
        '不过', '如果', '因为', '所以', '虽然', '可以', '就是', '这样', '这么', '那么',
        '什么', '怎么', '为什么', '如何', '谁', '哪', '哪个', '哪些', '里', '个', '为',
        '啊', '呢', '吧', '吗', '嘛', '哦', '嗯', '哈', '哈哈', '嘿嘿', '呵呵'
    ])
    
    # 清洗文本
    text = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9]', ' ', text)
    
    # 分词
    words = jieba.lcut(text)
    
    # 过滤停用词和短词
    filtered_words = [
        w.strip() for w in words 
        if len(w.strip()) >= 2 and w.strip() not in stop_words
    ]
    
    # 统计词频
    word_counts = Counter(filtered_words)
    
    # 转换为前端需要的格式
    result = [
        {'name': word, 'value': count}
        for word, count in word_counts.most_common(limit)
    ]
    
    return result


@analysis_bp.route('/dashboard', methods=['GET'])
def get_dashboard_data():
    """
    获取数据分析看板的聚合数据
    
    返回:
    - hosts: 主播档案列表
    - hostMetrics: 各主播能力评分
    - wordCloudData: 词云数据（按课程分组）
    """
    import jieba.analyse
    
    response_data = {
        'success': True,
        'hosts': [],
        'hostMetrics': {},
        'wordCloudData': {}
    }
    
    try:
        # ==========================================
        # 模块 1：主播运营分析
        # ==========================================
        async def fetch_live_data():
            await prisma.connect()
            try:
                records = await prisma.liverecord.find_many()
                return records
            finally:
                await prisma.disconnect()
        
        records = asyncio.run(fetch_live_data())
        
        # 按主播分组统计
        host_data: Dict[str, Dict[str, List[float]]] = {}
        for record in records:
            host = record.hostName
            if host not in host_data:
                host_data[host] = {
                    'interaction_rate': [],
                    'share_rate': [],
                    'follow_rate': [],
                    'wechat_add_rate': [],
                    'avg_watch_duration': []
                }
            
            host_data[host]['interaction_rate'].append(record.interactionRate)
            host_data[host]['share_rate'].append(record.shareRate)
            host_data[host]['follow_rate'].append(record.followRate)
            host_data[host]['wechat_add_rate'].append(record.wechatAddRate)
            host_data[host]['avg_watch_duration'].append(record.avgWatchDuration)
        
        # 构建主播档案和指标
        hosts_list = []
        host_metrics = {}
        host_id = 1
        
        for host_name, metrics in host_data.items():
            # 计算平均分
            avg_interaction = sum(metrics['interaction_rate']) / len(metrics['interaction_rate']) if metrics['interaction_rate'] else 0
            avg_share = sum(metrics['share_rate']) / len(metrics['share_rate']) if metrics['share_rate'] else 0
            avg_follow = sum(metrics['follow_rate']) / len(metrics['follow_rate']) if metrics['follow_rate'] else 0
            avg_wechat = sum(metrics['wechat_add_rate']) / len(metrics['wechat_add_rate']) if metrics['wechat_add_rate'] else 0
            avg_duration = sum(metrics['avg_watch_duration']) / len(metrics['avg_watch_duration']) if metrics['avg_watch_duration'] else 0
            
            # 构建主播档案
            strengths = []
            weaknesses = []
            
            if avg_interaction >= 80:
                strengths.append('互动能力强')
            elif avg_interaction < 60:
                weaknesses.append('互动率待提升')
            
            if avg_wechat >= 80:
                strengths.append('转化能力强')
            elif avg_wechat < 60:
                weaknesses.append('转化率有提升空间')
            
            if avg_duration >= 30:
                strengths.append('内容吸引力强')
            elif avg_duration < 15:
                weaknesses.append('留存时间较短')
            
            if not strengths:
                strengths.append('表现稳定')
            if not weaknesses:
                weaknesses.append('暂无明显短板')
            
            hosts_list.append({
                'id': str(host_id),
                'name': host_name,
                'strengths': strengths,
                'weaknesses': weaknesses
            })
            
            # 五维评分：专业度、节奏感、转化率、互动率、留存率
            scores = [
                round(min(max(avg_wechat + 10, 0), 100), 1),
                round(min(max(avg_share + 15, 0), 100), 1),
                round(min(max(avg_follow, 0), 100), 1),
                round(min(max(avg_interaction, 0), 100), 1),
                round(min(max(avg_duration * 2, 0), 100), 1)
            ]
            
            host_metrics[str(host_id)] = {
                'name': host_name,
                'scores': scores
            }
            
            host_id += 1
        
        response_data['hosts'] = hosts_list
        response_data['hostMetrics'] = host_metrics
        
    except Exception as e:
        print(f"主播分析模块异常: {str(e)}")
    
    # ==========================================
    # 模块 2：课程运营分析 (按课程动态生成词云)
    # ==========================================
    try:
        async def fetch_course_feedback():
            await prisma.connect()
            try:
                feedbacks = await prisma.coursefeedback.find_many(
                    where={'studentReview': {'not': None}}
                )
                return feedbacks
            finally:
                await prisma.disconnect()
        
        reviews = asyncio.run(fetch_course_feedback())
        
        word_cloud_map = {}
        if reviews:
            # 按课程名称分组聚合文本
            course_texts = {}
            for r in reviews:
                c_name = r.courseName if r.courseName else "未知课程"
                text = r.studentReview
                if isinstance(text, str) and text.strip():
                    if c_name not in course_texts:
                        course_texts[c_name] = []
                    course_texts[c_name].append(text)
            
            # 对每个课程执行 NLP 关键词提取
            for c_name, texts in course_texts.items():
                text_corpus = " ".join(texts)
                try:
                    tags = jieba.analyse.extract_tags(text_corpus, topK=15, withWeight=True)
                    word_cloud_map[c_name] = [{"name": tag[0], "value": int(tag[1] * 100) + 5} for tag in tags]
                except Exception as e:
                    word_cloud_map[c_name] = [{"name": "分词异常", "value": 10}]
        else:
            word_cloud_map["默认"] = [{"name": "等待数据", "value": 10}]
            
        response_data["wordCloudData"] = word_cloud_map
    except Exception as e:
        print(f"课程词云模块异常: {str(e)}")
        response_data["wordCloudData"] = {}
    
    return jsonify(response_data)


@analysis_bp.route('/live_dashboard', methods=['GET'])
def get_live_dashboard_data():
    """
    获取直播看板数据
    
    返回:
    - success: 是否成功
    - hosts: 主播列表 [{name, summary, liveCount, avgViewers, totalViewers, avgRetention}]
    - hostMetrics: 主播指标 {主播名: {name, scores, avgViewers, totalViewers, liveCount, avgPeak, maxPeak, retention, interaction, fansRate}}
    - trend: 趋势数据 {dates: string[], values: number[]}
    """
    try:
        async def fetch_live_data():
            await prisma.connect()
            try:
                records = await prisma.liverecord.find_many(
                    order={'liveDate': 'desc'}
                )
                return records
            finally:
                await prisma.disconnect()
        
        records = asyncio.run(fetch_live_data())
        
        # 按主播分组统计
        host_data: Dict[str, Dict[str, Any]] = {}
        for record in records:
            host = record.hostName
            if host not in host_data:
                host_data[host] = {
                    'total_viewers': [],
                    'avg_watch_duration': [],
                    'interaction_rate': [],
                    'follow_rate': [],
                    'share_rate': [],
                    'wechat_add_rate': [],
                    'max_online_users': [],
                    'live_dates': []
                }
            
            host_data[host]['total_viewers'].append(record.totalViewers)
            host_data[host]['avg_watch_duration'].append(record.avgWatchDuration)
            host_data[host]['interaction_rate'].append(record.interactionRate)
            host_data[host]['follow_rate'].append(record.followRate)
            host_data[host]['share_rate'].append(record.shareRate)
            host_data[host]['wechat_add_rate'].append(record.wechatAddRate)
            host_data[host]['max_online_users'].append(record.maxOnlineUsers)
            host_data[host]['live_dates'].append(record.liveDate)
        
        # 构建主播列表和指标
        hosts_list = []
        host_metrics = {}
        
        for host_name, metrics in host_data.items():
            live_count = len(metrics['total_viewers'])
            avg_viewers = round(sum(metrics['total_viewers']) / live_count) if live_count > 0 else 0
            total_viewers = sum(metrics['total_viewers'])
            avg_retention = round(sum(metrics['avg_watch_duration']) / live_count, 1) if live_count > 0 else 0
            
            # 五维评分：专业度、节奏感、转化率、互动率、留存率
            avg_interaction = sum(metrics['interaction_rate']) / live_count if live_count > 0 else 0
            avg_share = sum(metrics['share_rate']) / live_count if live_count > 0 else 0
            avg_follow = sum(metrics['follow_rate']) / live_count if live_count > 0 else 0
            avg_wechat = sum(metrics['wechat_add_rate']) / live_count if live_count > 0 else 0
            
            scores = [
                round(min(max(avg_wechat + 10, 0), 100), 1),  # 专业度
                round(min(max(avg_share + 15, 0), 100), 1),   # 节奏感
                round(min(max(avg_follow, 0), 100), 1),       # 转化率
                round(min(max(avg_interaction, 0), 100), 1),  # 互动率
                round(min(max(avg_retention * 2, 0), 100), 1) # 留存率
            ]
            
            # 优势劣势分析
            strengths = []
            weaknesses = []
            
            if avg_interaction >= 80:
                strengths.append('互动能力强')
            elif avg_interaction < 60:
                weaknesses.append('互动率待提升')
            
            if avg_wechat >= 80:
                strengths.append('转化能力强')
            elif avg_wechat < 60:
                weaknesses.append('转化率有提升空间')
            
            if avg_retention >= 30:
                strengths.append('内容吸引力强')
            elif avg_retention < 15:
                weaknesses.append('留存时间较短')
            
            if not strengths:
                strengths.append('表现稳定')
            if not weaknesses:
                weaknesses.append('暂无明显短板')
            
            # 主播摘要
            summary = f"场均观看{avg_viewers}人，平均留存{avg_retention}分钟"
            
            hosts_list.append({
                'name': host_name,
                'summary': summary,
                'liveCount': live_count,
                'avgViewers': avg_viewers,
                'totalViewers': total_viewers,
                'avgRetention': round(avg_retention)
            })
            
            host_metrics[host_name] = {
                'name': host_name,
                'scores': scores,
                'avgViewers': avg_viewers,
                'totalViewers': total_viewers,
                'liveCount': live_count,
                'avgPeak': round(sum(metrics['max_online_users']) / live_count) if live_count > 0 else 0,
                'maxPeak': max(metrics['max_online_users']) if metrics['max_online_users'] else 0,
                'retention': round(avg_retention),
                'interaction': round(avg_interaction, 1),
                'fansRate': round(avg_follow, 1)
            }
        
        # 构建趋势数据（最近7场直播）
        trend_dates = []
        trend_values = []
        if records:
            # 按日期排序，取最近7场
            sorted_records = sorted(records, key=lambda x: x.liveDate, reverse=True)[:7]
            sorted_records.reverse()  # 时间正序
            
            for record in sorted_records:
                # 格式化日期为 MM-DD
                date_str = record.liveDate.strftime('%m-%d')
                trend_dates.append(date_str)
                trend_values.append(record.totalViewers)
        
        return jsonify({
            'success': True,
            'hosts': hosts_list,
            'hostMetrics': host_metrics,
            'trend': {
                'dates': trend_dates,
                'values': trend_values
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'获取直播看板数据失败: {str(e)}'
        }), 500
