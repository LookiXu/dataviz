"""
数据上传与 AI 总结 API
"""
import pandas as pd
from flask import Blueprint, request, jsonify
import asyncio
from typing import Dict, Any
import json
import io

from app.core.database import prisma
from app.utils.data_processor import data_processor

upload_bp = Blueprint('upload', __name__, url_prefix='/api')


@upload_bp.route('/upload', methods=['POST'])
def upload_data():
    """
    接收数据文件并触发 AI 生成总结报告
    
    支持的文件格式: CSV, Excel (.xlsx, .xls)
    
    请求参数:
    - file: 数据文件
    - data_type: 数据类型 ('live' 或 'feedback')
    
    返回:
    - success: 是否成功
    - message: 处理消息
    - data: 处理后的数据摘要
    - summary: AI 生成的总结（预留）
    """
    try:
        # 1. 检查文件
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': '未找到上传的文件'
            }), 400
        
        file = request.files['file']
        data_type = request.form.get('data_type', 'live')
        
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': '文件名为空'
            }), 400
        
        # 2. 读取文件
        file_content = file.read()
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(file_content))
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(file_content))
        else:
            return jsonify({
                'success': False,
                'error': '不支持的文件格式，请上传 CSV 或 Excel 文件'
            }), 400
        
        # 3. 数据验证
        if data_type == 'live':
            required_fields = ['topic', 'host_name', 'live_date']
        else:
            required_fields = ['course_name', 'instructor_name', 'satisfaction']
        
        validation_result = data_processor.validate_data(df, required_fields)
        if not validation_result['valid']:
            return jsonify({
                'success': False,
                'error': '数据验证失败',
                'details': validation_result['errors']
            }), 400
        
        # 4. 数据处理
        if data_type == 'live':
            df_processed = data_processor.process_live_data(df)
        else:
            df_processed = data_processor.process_feedback_data(df)
        
        # 5. 保存到数据库（异步操作）
        async def save_data():
            await prisma.connect()
            try:
                if data_type == 'live':
                    for _, row in df_processed.iterrows():
                        await prisma.liverecord.create(
                            data={
                                'topic': str(row['topic']),
                                'hostName': str(row['host_name']),
                                'liveDate': row['live_date'],
                                'durationMinutes': int(row['duration_minutes']),
                                'totalViewers': int(row['total_viewers']),
                                'liveViewers': int(row['live_viewers']),
                                'reservationCount': int(row['reservation_count']),
                                'reservationRate': float(row['reservation_rate']),
                                'avgWatchDuration': float(row['avg_watch_duration']),
                                'maxOnlineUsers': int(row['max_online_users']),
                                'followRate': float(row['follow_rate']),
                                'interactionRate': float(row['interaction_rate']),
                                'shareRate': float(row['share_rate']),
                                'newFollowers': int(row['new_followers']),
                                'orderCount': int(row['order_count']),
                                'wechatAddRate': float(row['wechat_add_rate']),
                                'viralTrafficCount': int(row.get('viral_traffic_count', 0))
                            }
                        )
                else:
                    for _, row in df_processed.iterrows():
                        await prisma.coursefeedback.create(
                            data={
                                'courseName': str(row['course_name']),
                                'instructorName': str(row['instructor_name']),
                                'satisfaction': int(row['satisfaction']),
                                'practicality': int(row['practicality']),
                                'studentReview': str(row.get('student_review', '无')),
                                'reviewDate': row['review_date']
                            }
                        )
            finally:
                await prisma.disconnect()
        
        asyncio.run(save_data())
        
        # 6. 生成 AI 总结（预留接口）
        # TODO: 集成 AI 服务生成总结报告
        ai_summary = generate_ai_summary(df_processed, data_type)
        
        # 7. 返回结果
        return jsonify({
            'success': True,
            'message': f'成功处理 {len(df_processed)} 条记录',
            'data': {
                'total_records': len(df_processed),
                'data_type': data_type,
                'sample': df_processed.head(3).to_dict('records') if len(df_processed) > 0 else []
            },
            'summary': ai_summary
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'处理失败: {str(e)}'
        }), 500


def generate_ai_summary(df: pd.DataFrame, data_type: str) -> Dict[str, Any]:
    """
    生成 AI 总结报告（预留接口，后续接入真实 AI 服务）
    
    Args:
        df: 处理后的数据
        data_type: 数据类型
        
    Returns:
        Dict: 总结报告
    """
    if data_type == 'live':
        # 直播数据总结
        total_viewers = df['total_viewers'].sum()
        avg_interaction = df['interaction_rate'].mean()
        top_host = df.groupby('host_name')['engagement_score'].mean().idxmax() if 'engagement_score' in df.columns else 'N/A'
        
        return {
            'type': 'live_summary',
            'highlights': [
                f'累计观看人数: {total_viewers:,}',
                f'平均互动率: {avg_interaction:.2f}%',
                f'最佳表现主播: {top_host}'
            ],
            'recommendations': [
                '建议优化直播时段，提升高峰期的观众留存率',
                '重点关注互动率较低的主播，提供专项培训'
            ],
            'ai_generated': False,  # 标记为模拟数据
            'note': '此为预留接口，后续将接入真实 AI 服务'
        }
    else:
        # 课程反馈总结
        avg_satisfaction = df['satisfaction'].mean()
        avg_practicality = df['practicality'].mean()
        
        return {
            'type': 'feedback_summary',
            'highlights': [
                f'平均满意度: {avg_satisfaction:.2f}/5.0',
                f'平均实用性: {avg_practicality:.2f}/5.0'
            ],
            'recommendations': [
                '根据学员反馈优化课程内容结构',
                '增强实操环节，提升实用性评分'
            ],
            'ai_generated': False,
            'note': '此为预留接口，后续将接入真实 AI 服务'
        }
