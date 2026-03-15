"""
数据处理器模块
处理数据导入、清洗、缺失值填充和特征计算
"""
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, Any, List, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DataProcessor:
    """数据处理引擎，负责数据清洗、缺失值处理和特征计算"""
    
    # 数值型字段列表
    NUMERIC_FIELDS = [
        'duration_minutes', 'total_viewers', 'live_viewers',
        'reservation_count', 'reservation_rate', 'avg_watch_duration',
        'max_online_users', 'follow_rate', 'interaction_rate',
        'share_rate', 'new_followers', 'order_count', 'wechat_add_rate',
        'viral_traffic_count', 'satisfaction', 'practicality'
    ]
    
    # 文本型字段列表
    TEXT_FIELDS = [
        'topic', 'host_name', 'course_name', 'instructor_name', 'student_review'
    ]
    
    # 日期字段列表
    DATE_FIELDS = ['live_date', 'review_date']
    
    def __init__(self):
        self.numeric_means: Dict[str, float] = {}
    
    def standardize_date(self, date_value: Any) -> Optional[str]:
        """
        标准化日期格式为 YYYY-MM-DD
        
        Args:
            date_value: 原始日期值（支持多种格式）
            
        Returns:
            str: 标准化后的日期字符串，或 None 如果解析失败
        """
        if pd.isna(date_value) or date_value is None:
            return None
            
        # 如果已经是标准格式
        if isinstance(date_value, str):
            date_str = date_value.strip()
            # 尝试直接匹配 YYYY-MM-DD
            try:
                datetime.strptime(date_str, '%Y-%m-%d')
                return date_str
            except ValueError:
                pass
        
        # 尝试多种日期格式解析
        date_formats = [
            '%Y/%m/%d', '%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y',
            '%m/%d/%Y', '%m-%d-%Y', '%Y%m%d', '%Y年%m月%d日'
        ]
        
        for fmt in date_formats:
            try:
                parsed_date = datetime.strptime(str(date_value).strip(), fmt)
                return parsed_date.strftime('%Y-%m-%d')
            except ValueError:
                continue
        
        # 尝试 pandas 自动解析
        try:
            parsed = pd.to_datetime(date_value, errors='coerce')
            if pd.notna(parsed):
                return parsed.strftime('%Y-%m-%d')
        except Exception:
            pass
            
        logger.warning(f"无法解析日期: {date_value}")
        return None
    
    def fill_missing_values(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        填充缺失值：
        - 数值型字段：使用均值填充
        - 文本型字段：填充"无"
        
        Args:
            df: 原始 DataFrame
            
        Returns:
            pd.DataFrame: 填充后的 DataFrame
        """
        df_cleaned = df.copy()
        
        # 数值型字段：均值填充
        for field in self.NUMERIC_FIELDS:
            if field in df_cleaned.columns:
                mean_value = df_cleaned[field].mean()
                self.numeric_means[field] = mean_value if pd.notna(mean_value) else 0
                df_cleaned[field] = df_cleaned[field].fillna(self.numeric_means[field])
                logger.info(f"字段 '{field}' 缺失值已用均值 {self.numeric_means[field]:.2f} 填充")
        
        # 文本型字段：填充"无"
        for field in self.TEXT_FIELDS:
            if field in df_cleaned.columns:
                df_cleaned[field] = df_cleaned[field].fillna('无')
                df_cleaned[field] = df_cleaned[field].replace('', '无')
                logger.info(f"字段 '{field}' 缺失值已用'无'填充")
        
        return df_cleaned
    
    def standardize_dates(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        标准化所有日期字段
        
        Args:
            df: 原始 DataFrame
            
        Returns:
            pd.DataFrame: 日期标准化后的 DataFrame
        """
        df_cleaned = df.copy()
        
        for field in self.DATE_FIELDS:
            if field in df_cleaned.columns:
                df_cleaned[field] = df_cleaned[field].apply(self.standardize_date)
                missing_dates = df_cleaned[field].isna().sum()
                if missing_dates > 0:
                    logger.warning(f"字段 '{field}' 有 {missing_dates} 条记录日期解析失败")
        
        return df_cleaned
    
    def calculate_viral_traffic_ratio(self, viral_count: int, total_viewers: int) -> float:
        """
        计算裂变流量占比
        
        公式: 裂变流量占比 = (裂变人数 / 总观看人数) × 100%
        
        Args:
            viral_count: 裂变人数
            total_viewers: 总观看人数
            
        Returns:
            float: 裂变流量占比(%)
        """
        if total_viewers == 0 or pd.isna(total_viewers):
            return 0.0
        return round((viral_count / total_viewers) * 100, 2)
    
    def calculate_engagement_score(self, row: pd.Series) -> float:
        """
        计算综合互动得分（用于排名和评估）
        
        综合权重：
        - 互动率: 30%
        - 分享率: 25%
        - 关注率: 25%
        - 加微率: 20%
        
        Args:
            row: DataFrame 行数据
            
        Returns:
            float: 综合互动得分
        """
        interaction_rate = row.get('interaction_rate', 0)
        share_rate = row.get('share_rate', 0)
        follow_rate = row.get('follow_rate', 0)
        wechat_add_rate = row.get('wechat_add_rate', 0)
        
        score = (
            interaction_rate * 0.30 +
            share_rate * 0.25 +
            follow_rate * 0.25 +
            wechat_add_rate * 0.20
        )
        return round(score, 2)
    
    def process_live_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        处理直播数据完整流程
        
        Args:
            df: 原始直播数据 DataFrame
            
        Returns:
            pd.DataFrame: 处理后的 DataFrame
        """
        logger.info(f"开始处理直播数据，原始记录数: {len(df)}")
        
        # 1. 标准化列名（转换为蛇形命名）
        df.columns = [col.lower().replace(' ', '_') for col in df.columns]
        
        # 2. 日期标准化
        df = self.standardize_dates(df)
        
        # 3. 缺失值填充
        df = self.fill_missing_values(df)
        
        # 4. 计算裂变流量占比（如果存在相关字段）
        if 'viral_traffic_count' in df.columns and 'total_viewers' in df.columns:
            df['viral_traffic_ratio'] = df.apply(
                lambda row: self.calculate_viral_traffic_ratio(
                    row['viral_traffic_count'],
                    row['total_viewers']
                ),
                axis=1
            )
            logger.info("已计算裂变流量占比")
        
        # 5. 计算综合互动得分
        df['engagement_score'] = df.apply(self.calculate_engagement_score, axis=1)
        logger.info("已计算综合互动得分")
        
        logger.info(f"数据处理完成，最终记录数: {len(df)}")
        return df
    
    def process_feedback_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        处理课程反馈数据完整流程
        
        Args:
            df: 原始反馈数据 DataFrame
            
        Returns:
            pd.DataFrame: 处理后的 DataFrame
        """
        logger.info(f"开始处理课程反馈数据，原始记录数: {len(df)}")
        
        # 1. 标准化列名
        df.columns = [col.lower().replace(' ', '_') for col in df.columns]
        
        # 2. 日期标准化
        df = self.standardize_dates(df)
        
        # 3. 缺失值填充
        df = self.fill_missing_values(df)
        
        # 4. 确保评分在有效范围内 (1-5)
        if 'satisfaction' in df.columns:
            df['satisfaction'] = df['satisfaction'].clip(1, 5)
        if 'practicality' in df.columns:
            df['practicality'] = df['practicality'].clip(1, 5)
        
        logger.info(f"数据处理完成，最终记录数: {len(df)}")
        return df
    
    def validate_data(self, df: pd.DataFrame, required_fields: List[str]) -> Dict[str, Any]:
        """
        数据验证
        
        Args:
            df: 待验证的 DataFrame
            required_fields: 必填字段列表
            
        Returns:
            Dict: 验证结果
        """
        errors = []
        warnings = []
        
        # 检查必填字段
        missing_fields = [f for f in required_fields if f not in df.columns]
        if missing_fields:
            errors.append(f"缺少必填字段: {missing_fields}")
        
        # 检查空值比例
        for col in df.columns:
            null_ratio = df[col].isna().sum() / len(df)
            if null_ratio > 0.5:
                warnings.append(f"字段 '{col}' 缺失值比例高达 {null_ratio:.1%}")
        
        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
            'total_rows': len(df)
        }


# 单例模式
data_processor = DataProcessor()
