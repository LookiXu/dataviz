import pandas as pd
import numpy as np
import io
import re
from datetime import date
import models


def clean_header(df):
    df.columns = [str(col).replace(' ', '').replace('\n', '').replace('\r', '') for col in df.columns]
    return df


def safe_float(val):
    if val is None or val == "":
        return 0.0
    val_str = str(val).replace(',', '').replace(' ', '').strip()
    if val_str == '':
        return 0.0
    if '%' in val_str:
        val_str = val_str.replace('%', '')
        try:
            return float(val_str) / 100
        except:
            return 0.0
    try:
        return float(val_str)
    except:
        return 0.0


def safe_int(val):
    return int(safe_float(val))


def parse_duration(val):
    if val is None or val == "":
        return 0
    val_str = str(val).strip()
    nums = re.findall(r'\d+', val_str)
    if not nums:
        return 0
    if '小时' in val_str or '时' in val_str:
        hours = 0
        minutes = 0
        hours_match = re.search(r'(\d+)\s*小时', val_str)
        if hours_match:
            hours = int(hours_match.group(1))
        minutes_match = re.search(r'(\d+)\s*分', val_str)
        if minutes_match:
            minutes = int(minutes_match.group(1))
        return hours * 60 + minutes
    if '分' in val_str:
        minutes_match = re.search(r'(\d+)\s*分', val_str)
        if minutes_match:
            return int(minutes_match.group(1))
    if nums:
        return int(nums[0])
    return 0


def parse_smart_date(val):
    if not val or pd.isna(val):
        return None
    match = re.search(r'(\d{1,2})[./月-](\d{1,2})', str(val))
    if match:
        try:
            month = int(match.group(1))
            day = int(match.group(2))
            year = 2025 if month >= 8 else 2026
            return date(year, month, day)
        except ValueError:
            return None
    return None


def parse_avg_watch_time(val):
    if not val or pd.isna(val):
        return 0.0
    val_str = str(val).strip()
    # 匹配 "16分48秒" 格式
    match1 = re.search(r'(\d+)分(\d+)秒', val_str)
    if match1:
        return round(int(match1.group(1)) + int(match1.group(2)) / 60.0, 2)
    # 匹配 "16:48" 或 "16：48" 格式
    match2 = re.search(r'(\d+)[:：](\d+)', val_str)
    if match2:
        return round(int(match2.group(1)) + int(match2.group(2)) / 60.0, 2)
    # 提取纯数字
    match3 = re.search(r'(\d+(\.\d+)?)', val_str)
    if match3:
        return round(float(match3.group(1)), 2)
    return 0.0


def parse_feedback_score(text):
    if not isinstance(text, str) or pd.isna(text):
        return None
    mapping = {
        '非常优秀': 95, '非常清晰': 95, '非常实用': 95, '非常适中': 80,
        '优秀': 85, '良好': 75,
        '比较实用': 70, '比较清晰': 70, '较好': 70, '适中': 80,
        '偏快': 60, '偏慢': 60, '一般': 60
    }
    for key, val in mapping.items():
        if key in text:
            return val
    return None


def safe_float(val, default=80.0):
    """强制剥离 numpy 类型，转换为原生 float，并处理 NaN"""
    try:
        import pandas as pd
        if pd.isna(val):
            return float(default)
        return float(val)
    except:
        return float(default)


def extract_val(row_dict, keywords, cast_func, default_val):
    for key in row_dict.keys():
        for keyword in keywords:
            if keyword in str(key):
                val = row_dict[key]
                if val is None or val == "":
                    return default_val
                return cast_func(val)
    return default_val


def read_file(file_bytes: bytes):
    try:
        df = pd.read_excel(io.BytesIO(file_bytes))
        return df
    except:
        try:
            df = pd.read_csv(io.BytesIO(file_bytes))
            return df
        except:
            raise ValueError("无法识别文件格式")


def process_live_data(file_bytes: bytes) -> list[dict]:
    try:
        df = read_file(file_bytes)
        df = clean_header(df)
        df.fillna("", inplace=True)
        records = df.to_dict('records')
        
        result = []
        for row in records:
            record = {
                'topic': extract_val(row, ["主题", "标题", "名称"], str, ""),
                'hostName': extract_val(row, ["主播", "讲师", "人员"], str, "未知"),
                'liveDate': parse_smart_date(extract_val(row, ["日期", "时间", "开播"], str, None)),
                'durationMinutes': parse_duration(extract_val(row, ["时长"], str, 0)),
                'totalViewers': extract_val(row, ["场观", "观看总", "累计"], safe_int, 0),
                'liveViewers': extract_val(row, ["观看", "观众"], safe_int, 0),
                'reservationCount': extract_val(row, ["预约", "报名"], safe_int, 0),
                'reservationRate': extract_val(row, ["预约率", "转化率"], safe_float, 0.0),
                'avgWatchDuration': extract_val(row, ["人均观看", "停留", "平均时长"], parse_avg_watch_time, 0.0),
                'maxOnlineUsers': extract_val(row, ["最高", "峰值", "在线"], safe_int, 0),
                'followRate': extract_val(row, ["关注率"], safe_float, 0.0),
                'interactionRate': extract_val(row, ["互动率", "评论率"], safe_float, 0.0),
                'shareRate': extract_val(row, ["分享率"], safe_float, 0.0),
                'newFollowers': extract_val(row, ["涨粉", "新增", "关注"], safe_int, 0),
                'orderCount': extract_val(row, ["订单", "成交"], safe_int, 0),
                'wechatAddRate': extract_val(row, ["微信", "加微"], safe_float, 0.0),
                'viralTrafficCount': extract_val(row, ["病毒", "传播"], safe_int, 0)
            }
            result.append(record)
        
        return result
    except Exception as e:
        raise ValueError(f"解析失败: {str(e)}")


def process_course_data(file_bytes: bytes, related_name: str = None) -> list[dict]:
    try:
        df = read_file(file_bytes)
        df = clean_header(df)
        df.fillna("", inplace=True)
        
        records = []
        # 动态识别含有特定关键字的列名
        cols_teaching = [c for c in df.columns if '教学质量' in c]
        cols_practical = [c for c in df.columns if '实用性' in c]
        cols_pace = [c for c in df.columns if '节奏' in c]
        cols_expr = [c for c in df.columns if '表达' in c]
        cols_activity = [c for c in df.columns if '晚间活动打分' in c]
        
        # 识别所有可能包含评价内容的列（用于词云分析）
        review_keywords = ['评价', '建议', '反馈', '收获', '感受', '问题', '想法', '意见', '评论']
        cols_review = [c for c in df.columns if any(kw in c for kw in review_keywords)]
        
        for _, row in df.iterrows():
            # 计算 5 个维度的行级平均分
            raw_t = pd.Series([parse_feedback_score(row[c]) for c in cols_teaching]).dropna().mean()
            raw_p = pd.Series([parse_feedback_score(row[c]) for c in cols_practical]).dropna().mean()
            raw_pace = pd.Series([parse_feedback_score(row[c]) for c in cols_pace]).dropna().mean()
            raw_e = pd.Series([parse_feedback_score(row[c]) for c in cols_expr]).dropna().mean()
            raw_a = pd.Series([parse_feedback_score(row[c]) for c in cols_activity]).dropna().mean()
            
            # 强制类型转换，彻底切断 numpy.float64
            t_score = safe_float(raw_t, 80.0)
            p_score = safe_float(raw_p, 80.0)
            pace_score = safe_float(raw_pace, 80.0)
            e_score = safe_float(raw_e, 80.0)
            a_score = safe_float(raw_a, 80.0)
            
            # 总体满意度
            overall_100 = (t_score + p_score + pace_score + e_score + a_score) / 5.0
            overall_5 = round(overall_100 / 20.0, 1)
            
            # 合并所有评价文本（用于词云分析）
            all_reviews = []
            for c in cols_review:
                val = row[c]
                if isinstance(val, str) and val.strip() and val.strip().lower() not in ['nan', 'none', '']:
                    all_reviews.append(val.strip())
            
            combined_review = " | ".join(all_reviews) if all_reviews else ""
            
            record = {
                'courseName': related_name if related_name else "未知课程",
                'instructorName': extract_val(row, ["讲师", "老师"], str, ""),
                'satisfaction': overall_5,
                'practicality': extract_val(row, ["实用", "干货"], safe_int, 5),
                'studentReview': combined_review,
                'reviewDate': extract_val(row, ["日期", "时间"], str, None),
                'teachingScore': t_score,
                'practicalScore': p_score,
                'paceScore': pace_score,
                'expressionScore': e_score,
                'activityScore': a_score
            }
            records.append(record)
        
        return records
    except Exception as e:
        raise ValueError(f"解析失败: {str(e)}")
