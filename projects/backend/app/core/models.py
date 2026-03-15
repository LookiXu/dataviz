"""
数据模型类型定义
"""
from typing import TypedDict, Optional, List
from datetime import datetime


class LiveRecordData(TypedDict):
    """直播记录数据结构"""
    topic: str
    host_name: str
    live_date: str
    duration_minutes: int
    total_viewers: int
    live_viewers: int
    reservation_count: int
    reservation_rate: float
    avg_watch_duration: float
    max_online_users: int
    follow_rate: float
    interaction_rate: float
    share_rate: float
    new_followers: int
    order_count: int
    wechat_add_rate: float
    viral_traffic_count: Optional[int]


class CourseFeedbackData(TypedDict):
    """课程反馈数据结构"""
    course_name: str
    instructor_name: str
    satisfaction: int
    practicality: int
    student_review: str
    review_date: str


class AISummaryData(TypedDict):
    """AI 总结数据结构"""
    live_record_id: str
    summary_content: str
    key_metrics: Optional[dict]


class RadarChartData(TypedDict):
    """雷达图数据结构"""
    host_name: str
    metrics: dict  # 各维度指标值


class WordCloudItem(TypedDict):
    """词云数据项"""
    name: str      # 词语
    value: int     # 出现次数/权重
