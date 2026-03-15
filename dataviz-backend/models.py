import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Integer, Float, Date, DateTime, Text, ForeignKey, JSON, Boolean
from database import Base


class LiveRecord(Base):
    __tablename__ = "live_records"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    topic = Column(String)
    hostName = Column(String)
    liveDate = Column(Date)
    durationMinutes = Column(Integer)
    totalViewers = Column(Integer)
    liveViewers = Column(Integer)
    reservationCount = Column(Integer)
    reservationRate = Column(Float)
    avgWatchDuration = Column(Float)
    maxOnlineUsers = Column(Integer)
    followRate = Column(Float)
    interactionRate = Column(Float)
    shareRate = Column(Float)
    newFollowers = Column(Integer)
    orderCount = Column(Integer)
    wechatAddRate = Column(Float)
    viralTrafficCount = Column(Integer, default=0)


class CourseFeedback(Base):
    __tablename__ = "course_feedbacks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    courseName = Column(String)
    instructorName = Column(String)
    satisfaction = Column(Float)
    practicality = Column(Integer)
    studentReview = Column(Text)
    reviewDate = Column(Date)
    
    teachingScore = Column(Float, default=0.0)  # 教学质量
    practicalScore = Column(Float, default=0.0) # 内容实用
    paceScore = Column(Float, default=0.0)      # 节奏把控
    expressionScore = Column(Float, default=0.0)# 讲师表达
    activityScore = Column(Float, default=0.0)  # 活动设计


class AISummary(Base):
    __tablename__ = "ai_summaries"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    liveRecordId = Column(String, ForeignKey('live_records.id'), nullable=True)
    courseFeedbackId = Column(String, ForeignKey('course_feedbacks.id'), nullable=True)
    summaryContent = Column(Text)
    keyMetrics = Column(JSON)
    generatedAt = Column(DateTime)


class Todo(Base):
    __tablename__ = "todos"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    title = Column(String, nullable=False)
    completed = Column(Boolean, default=False)
    priority = Column(String, default="medium")