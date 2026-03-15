from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import engine, get_db
import models
import data_processor
import os
import json
from openai import OpenAI
from pydantic import BaseModel, validator
from typing import List, Optional
import jieba
import jieba.analyse
import pandas as pd
import re
import logging
from datetime import datetime
from enum import Enum

# 配置日志记录
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# 错误代码枚举
class ErrorCode(str, Enum):
    UPLOAD_FORMAT_ERROR = "UPLOAD_FORMAT_ERROR"
    UPLOAD_EMPTY_FILE = "UPLOAD_EMPTY_FILE"
    UPLOAD_INVALID_TYPE = "UPLOAD_INVALID_TYPE"
    DATA_VALIDATION_ERROR = "DATA_VALIDATION_ERROR"
    AI_SERVICE_ERROR = "AI_SERVICE_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"
    NOT_FOUND = "NOT_FOUND"
    INVALID_PARAMETER = "INVALID_PARAMETER"

# 统一错误响应格式
class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    detail: Optional[str] = None
    code: Optional[str] = None
    timestamp: str = datetime.now().isoformat()

# 触发 SQLAlchemy 自动在 PostgreSQL 中创建所有表
models.Base.metadata.create_all(bind=engine)

# 创建FastAPI应用实例
app = FastAPI(title="DataVizPro Backend", version="1.0.0")

# 配置CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有跨域请求
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化大模型客户端 (使用环境变量配置，支持 DeepSeek、Kimi 等 OpenAI 兼容接口)
ai_client = OpenAI(
    api_key=os.getenv("LLM_API_KEY", "YOUR_API_KEY"),
    base_url=os.getenv("LLM_BASE_URL", "https://api.deepseek.com/v1")
)

# 定义前端传过来的请求体格式
class HostRecommendationRequest(BaseModel):
    hostA: dict
    hostB: dict
    
    @validator('hostA', 'hostB')
    def validate_host_data(cls, v):
        if 'name' not in v:
            raise ValueError('主播数据必须包含 name 字段')
        if 'scores' not in v or len(v['scores']) != 5:
            raise ValueError('scores 数组长度必须为 5（五维评分）')
        return v

# 安全解析播放时长的工具函数
def parse_watch_time(time_str):
    if pd.isna(time_str): return 0.0
    time_str = str(time_str)
    m = re.search(r'(\d+)分', time_str)
    s = re.search(r'(\d+)秒', time_str)
    mins = int(m.group(1)) if m else 0
    secs = int(s.group(1)) if s else 0
    return round(mins + secs / 60.0, 2)

# 健康检查路由
@app.get("/health")
def health_check():
    return {"status": "ok", "message": "DataVizPro Backend Foundation is solid"}


# ==========================================
# 首页统计接口
# ==========================================

@app.get("/api/overview/stats")
def get_overview_stats(db: Session = Depends(get_db)):
    """
    首页统计数据接口
    返回直播总数、课程反馈总数、数据处理成功率、日期范围、课程名称
    """
    try:
        # 1. 统计直播总数
        total_live_streams = db.query(models.LiveRecord).count()
        
        # 2. 统计课程反馈总数
        total_course_reviews = db.query(models.CourseFeedback).count()
        
        # 3. 数据处理成功率（假设为100%，因为所有上传的数据都成功处理）
        data_processing_success_rate = 100
        
        # 4. 日期范围
        earliest_live = db.query(models.LiveRecord).order_by(models.LiveRecord.liveDate.asc()).first()
        latest_live = db.query(models.LiveRecord).order_by(models.LiveRecord.liveDate.desc()).first()
        
        date_range = ""
        if earliest_live and latest_live and earliest_live.liveDate and latest_live.liveDate:
            start_month = earliest_live.liveDate.strftime('%b')
            start_year = earliest_live.liveDate.strftime('%Y')
            end_month = latest_live.liveDate.strftime('%b')
            end_year = latest_live.liveDate.strftime('%Y')
            
            if start_year == end_year:
                date_range = f"{start_month}-{end_month} {start_year}"
            else:
                date_range = f"{start_month} {start_year}-{end_month} {end_year}"
        
        # 5. 课程名称
        courses = db.query(models.CourseFeedback.courseName).distinct().all()
        course_names = " + ".join([c[0] for c in courses if c[0]])
        
        return {
            "success": True,
            "data": {
                "totalLiveStreams": total_live_streams,
                "totalCourseReviews": total_course_reviews,
                "dataProcessingSuccessRate": data_processing_success_rate,
                "dateRange": date_range,
                "courseNames": course_names
            }
        }
    
    except Exception as e:
        logger.error(f"统计数据接口异常: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "data": {
                "totalLiveStreams": 0,
                "totalCourseReviews": 0,
                "dataProcessingSuccessRate": 0,
                "dateRange": "",
                "courseNames": ""
            }
        }


@app.get("/api/overview/trend")
def get_overview_trend(db: Session = Depends(get_db)):
    """
    首页最近直播趋势接口
    返回最近直播的日期、主题、主播、观看人数
    """
    try:
        import os, glob
        
        # 1. 从文件读取最新数据
        base_dir = os.path.dirname(os.path.abspath(__file__))
        files = glob.glob(os.path.join(base_dir, "uploads", "*直播*.xlsx"))
        
        if not files:
            return {
                "success": True,
                "data": {
                    "trend": []
                }
            }
        
        latest = max(files, key=os.path.getmtime)
        df = pd.read_excel(latest)
        df.columns = df.columns.str.strip()
        
        # 2. 数据清洗
        if '累计观看人数' in df.columns:
            df['累计观看人数'] = pd.to_numeric(df['累计观看人数'], errors='coerce').fillna(0)
        else:
            df['累计观看人数'] = 0
        
        # 3. 解析日期
        df['直播日期_解析'] = df['直播日期'].apply(data_processor.parse_smart_date)
        
        # 4. 按日期排序，取最近10场
        df_sorted = df[df['直播日期_解析'].notna()].sort_values('直播日期_解析', ascending=False).head(10)
        
        # 5. 组装趋势数据
        trend_data = []
        for _, row in df_sorted.iterrows():
            date_str = row['直播日期_解析'].strftime('%m/%d') if pd.notna(row['直播日期_解析']) else ""
            topic = str(row.get('话题', '') or row.get('主题', '') or '未命名直播')
            host = str(row.get('主播', '未知主播')).split('&')[0].strip()  # 取第一个主播
            
            # 主播名称标准化
            if 'vivi' in host.lower():
                host = 'Vivi老师'
            elif host and host[0].isalpha():
                host = host.capitalize()
            
            viewers_k = round(row['累计观看人数'] / 1000, 1)
            
            trend_data.append({
                "date": date_str,
                "topic": topic,
                "host": host,
                "viewers": viewers_k
            })
        
        # 6. 按日期升序排列（最早的在前）
        trend_data.reverse()
        
        return {
            "success": True,
            "data": {
                "trend": trend_data
            }
        }
    
    except Exception as e:
        logger.error(f"直播趋势接口异常: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "data": {
                "trend": []
            }
        }


# ==========================================
# 待办任务 API 路由
# ==========================================

@app.get("/api/todos")
def get_todos(db: Session = Depends(get_db)):
    """获取待办列表"""
    try:
        todos = db.query(models.Todo).order_by(models.Todo.createdAt.desc()).all()
        
        return {
            "success": True,
            "data": {
                "todos": [
                    {
                        "id": todo.id,
                        "title": todo.title,
                        "completed": todo.completed,
                        "priority": todo.priority,
                        "createdAt": todo.createdAt.isoformat() if todo.createdAt else None
                    }
                    for todo in todos
                ]
            }
        }
    except Exception as e:
        logger.error(f"获取待办列表异常: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "data": {"todos": []}
        }


@app.post("/api/todos")
def create_todo(
    title: str = Form(...),
    priority: str = Form("medium"),
    db: Session = Depends(get_db)
):
    """添加待办"""
    try:
        new_todo = models.Todo(
            title=title,
            priority=priority
        )
        db.add(new_todo)
        db.commit()
        db.refresh(new_todo)
        
        return {
            "success": True,
            "data": {
                "todo": {
                    "id": new_todo.id,
                    "title": new_todo.title,
                    "completed": new_todo.completed,
                    "priority": new_todo.priority,
                    "createdAt": new_todo.createdAt.isoformat() if new_todo.createdAt else None
                }
            }
        }
    except Exception as e:
        db.rollback()
        logger.error(f"创建待办异常: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@app.put("/api/todos/{todo_id}")
def update_todo(
    todo_id: str,
    title: str = Form(None),
    completed: bool = Form(None),
    priority: str = Form(None),
    db: Session = Depends(get_db)
):
    """更新待办"""
    try:
        todo = db.query(models.Todo).filter(models.Todo.id == todo_id).first()
        
        if not todo:
            raise HTTPException(status_code=404, detail="Todo not found")
        
        if title is not None:
            todo.title = title
        if completed is not None:
            todo.completed = completed
        if priority is not None:
            todo.priority = priority
        
        db.commit()
        db.refresh(todo)
        
        return {
            "success": True,
            "data": {
                "todo": {
                    "id": todo.id,
                    "title": todo.title,
                    "completed": todo.completed,
                    "priority": todo.priority,
                    "createdAt": todo.createdAt.isoformat() if todo.createdAt else None
                }
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"更新待办异常: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@app.delete("/api/todos/{todo_id}")
def delete_todo(todo_id: str, db: Session = Depends(get_db)):
    """删除待办"""
    try:
        todo = db.query(models.Todo).filter(models.Todo.id == todo_id).first()
        
        if not todo:
            raise HTTPException(status_code=404, detail="Todo not found")
        
        db.delete(todo)
        db.commit()
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"删除待办异常: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


# 文件上传路由
@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    upload_type: str = Form(...),
    related_name: str = Form(None),
    db: Session = Depends(get_db)
):
    """
    文件上传接口
    - 支持直播数据和课程数据上传
    - 自动保存文件到uploads文件夹
    - 详细的错误处理和日志记录
    """
    logger.info(f"开始处理文件上传: filename={file.filename}, upload_type={upload_type}, related_name={related_name}")
    
    try:
        # 1. 验证文件
        if not file.filename:
            logger.error("文件名为空")
            return {
                "success": False,
                "error": "文件上传失败",
                "detail": "文件名不能为空",
                "code": ErrorCode.UPLOAD_EMPTY_FILE
            }
        
        # 2. 读取文件内容
        file_bytes = await file.read()
        if not file_bytes:
            logger.error("文件内容为空")
            return {
                "success": False,
                "error": "文件上传失败",
                "detail": "文件内容为空",
                "code": ErrorCode.UPLOAD_EMPTY_FILE
            }
        
        # 3. 验证文件类型
        file_extension = os.path.splitext(file.filename)[1].lower()
        if file_extension not in ['.xlsx', '.xls', '.csv']:
            logger.error(f"不支持的文件格式: {file_extension}")
            return {
                "success": False,
                "error": "文件格式不支持",
                "detail": f"仅支持 Excel (.xlsx, .xls) 和 CSV 文件，当前文件格式: {file_extension}",
                "code": ErrorCode.UPLOAD_FORMAT_ERROR
            }
        
        # 4. 验证上传类型
        if upload_type not in ['live', 'course']:
            logger.error(f"无效的上传类型: {upload_type}")
            return {
                "success": False,
                "error": "上传类型无效",
                "detail": "upload_type 必须是 'live' 或 'course'",
                "code": ErrorCode.UPLOAD_INVALID_TYPE
            }
        
        # 5. 课程上传必须提供 related_name
        if upload_type == 'course' and not related_name:
            logger.error("课程上传缺少 related_name 参数")
            return {
                "success": False,
                "error": "参数缺失",
                "detail": "上传课程数据时必须提供 related_name 参数（课程名称）",
                "code": ErrorCode.INVALID_PARAMETER
            }
        
        # 6. 保存文件到uploads文件夹
        base_dir = os.path.dirname(os.path.abspath(__file__))
        uploads_dir = os.path.join(base_dir, "uploads")
        os.makedirs(uploads_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        saved_filename = f"{timestamp}_{file.filename}"
        saved_filepath = os.path.join(uploads_dir, saved_filename)
        
        with open(saved_filepath, 'wb') as f:
            f.write(file_bytes)
        
        logger.info(f"文件已保存: {saved_filepath}")
        
        # 7. 处理数据
        try:
            if upload_type == 'live':
                # 直播数据 - 全量覆盖
                db.query(models.LiveRecord).delete()
                db.commit()
                
                data_list = data_processor.process_live_data(file_bytes)
                
                # 验证数据
                if not data_list:
                    logger.warning("直播数据处理结果为空")
                    return {
                        "success": False,
                        "error": "数据处理失败",
                        "detail": "文件中没有有效的直播数据，请检查文件格式和内容",
                        "code": ErrorCode.DATA_VALIDATION_ERROR
                    }
                
                # 批量插入
                for i, data in enumerate(data_list):
                    try:
                        record = models.LiveRecord(**data)
                        db.add(record)
                    except Exception as e:
                        logger.error(f"第 {i+1} 条数据插入失败: {str(e)}")
                        raise ValueError(f"第 {i+1} 条数据格式错误: {str(e)}")
                
                db.commit()
                logger.info(f"直播数据上传成功，共插入 {len(data_list)} 条记录")
                
                return {
                    "success": True,
                    "message": "上传并处理成功",
                    "records_inserted": len(data_list),
                    "file_saved": saved_filename
                }
            
            elif upload_type == 'course':
                # 课程数据 - 按课程名称覆盖
                db.query(models.CourseFeedback).filter(
                    models.CourseFeedback.courseName == related_name
                ).delete()
                db.commit()
                
                data_list = data_processor.process_course_data(file_bytes, related_name)
                
                # 验证数据
                if not data_list:
                    logger.warning(f"课程 '{related_name}' 数据处理结果为空")
                    return {
                        "success": False,
                        "error": "数据处理失败",
                        "detail": f"文件中没有有效的课程数据，请检查文件格式和内容",
                        "code": ErrorCode.DATA_VALIDATION_ERROR
                    }
                
                # 批量插入
                for i, data in enumerate(data_list):
                    try:
                        record = models.CourseFeedback(**data)
                        db.add(record)
                    except Exception as e:
                        logger.error(f"第 {i+1} 条数据插入失败: {str(e)}")
                        raise ValueError(f"第 {i+1} 条数据格式错误: {str(e)}")
                
                db.commit()
                logger.info(f"课程数据上传成功，课程: {related_name}，共插入 {len(data_list)} 条记录")
                
                return {
                    "success": True,
                    "message": "上传并处理成功",
                    "records_inserted": len(data_list),
                    "file_saved": saved_filename
                }
        
        except ValueError as e:
            db.rollback()
            logger.error(f"数据验证错误: {str(e)}")
            return {
                "success": False,
                "error": "数据验证失败",
                "detail": str(e),
                "code": ErrorCode.DATA_VALIDATION_ERROR
            }
        
        except Exception as e:
            db.rollback()
            logger.error(f"数据处理错误: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": "数据处理失败",
                "detail": f"处理文件时发生错误: {str(e)}",
                "code": ErrorCode.DATABASE_ERROR
            }
    
    except Exception as e:
        logger.error(f"文件上传异常: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": "文件上传失败",
            "detail": str(e),
            "code": ErrorCode.UPLOAD_FORMAT_ERROR
        }


@app.get("/api/metadata")
def get_metadata(db: Session = Depends(get_db)):
    """
    获取元数据（主播名单、课程名单）
    过滤组合主播，统一主播名称大小写，去重
    """
    # 1. 设置核心保底大名单
    default_streamers = ["Jayson", "Leo", "Tracy", "Wayne", "Vivi老师", "Anna", "Felix"]
    default_courses = ["公众演讲", "生涯规划"]
    
    # 2. 从数据库提取真实的去重名单
    db_streamers = [r[0] for r in db.query(models.LiveRecord.hostName).distinct().all() if r[0]]
    db_courses = [r[0] for r in db.query(models.CourseFeedback.courseName).distinct().all() if r[0]]
    
    # 3. 合并名单
    all_streamers = default_streamers + db_streamers
    
    # 4. 过滤组合主播（包含 &、、、和 等符号）
    filtered_streamers = []
    for name in all_streamers:
        # 过滤组合主播
        if any(sep in name for sep in ['&', '、', '，', '和', '与', '及']):
            continue
        filtered_streamers.append(name)
    
    # 5. 统一主播名称大小写并去重
    def normalize_host_name(name):
        name = str(name).strip()
        # 统一Vivi老师的写法
        if 'vivi' in name.lower():
            return 'Vivi老师'
        # 首字母大写
        if name and name[0].isalpha():
            return name.capitalize()
        return name
    
    # 去重
    unique_streamers = []
    seen = set()
    for name in filtered_streamers:
        normalized_name = normalize_host_name(name)
        if normalized_name not in seen:
            seen.add(normalized_name)
            unique_streamers.append(normalized_name)
    
    # 6. 合并课程名单并去重
    final_courses = list(set(default_courses + db_courses))
    
    return {
        "hosts": [{"id": name, "name": name} for name in sorted(unique_streamers)],
        "courses": [{"id": name, "name": name} for name in sorted(final_courses)]
    }


@app.get("/api/dashboard/course")
def get_course_dashboard(db: Session = Depends(get_db)):
    try:
        # 聚合查询真实存入的 5 维数据
        results = db.query(
            models.CourseFeedback.courseName,
            func.avg(models.CourseFeedback.satisfaction).label('avg_sat'),
            func.avg(models.CourseFeedback.teachingScore).label('avg_teach'),
            func.avg(models.CourseFeedback.practicalScore).label('avg_prac'),
            func.avg(models.CourseFeedback.paceScore).label('avg_pace'),
            func.avg(models.CourseFeedback.expressionScore).label('avg_expr'),
            func.avg(models.CourseFeedback.activityScore).label('avg_act'),
            func.count(models.CourseFeedback.id).label('student_count')
        ).group_by(models.CourseFeedback.courseName).all()
        courses = []
        for row in results:
            c_name = row.courseName if row.courseName else "未知课程"
            avg_score_5 = round(float(row.avg_sat), 1) if row.avg_sat else 0.0
            s_count = int(row.student_count) if row.student_count else 0
            
            # 组装极其真实的雷达图分数
            radar_scores = [
                round(float(row.avg_teach), 1) if row.avg_teach else 0.0,
                round(float(row.avg_prac), 1) if row.avg_prac else 0.0,
                round(float(row.avg_pace), 1) if row.avg_pace else 0.0,
                round(float(row.avg_expr), 1) if row.avg_expr else 0.0,
                round(float(row.avg_act), 1) if row.avg_act else 0.0
            ]
            courses.append({
                "courseName": c_name,
                "avgScore": avg_score_5,
                "studentCount": s_count,
                "radarScores": radar_scores
            })
        return {
            "courses": courses,
            "radarIndicators": ["教学质量", "内容实用", "节奏把控", "讲师表达", "活动设计"]
        }
    except Exception as e:
        logger.error(f"【严重错误】课程看板接口崩溃: {str(e)}")
        return {"courses": [], "radarIndicators": ["教学质量", "内容实用", "节奏把控", "讲师表达", "活动设计"]}


@app.get("/api/ai/course_diagnosis")
def get_course_ai_diagnosis(course_name: str, db: Session = Depends(get_db)):
    """
    一次性返回课程 AI 诊断报告
    三维边界防御：拦截空参数、拦截无数据、拦截大模型超时
    """
    if not course_name or course_name == "未选择":
        raise HTTPException(status_code=400, detail="必须提供有效的课程名称")

    # 1. 复用底层聚合查询，抓取真实业务数据
    result = db.query(
        func.avg(models.CourseFeedback.satisfaction).label('avg_sat'),
        func.avg(models.CourseFeedback.teachingScore).label('avg_teach'),
        func.avg(models.CourseFeedback.practicalScore).label('avg_prac'),
        func.avg(models.CourseFeedback.paceScore).label('avg_pace'),
        func.avg(models.CourseFeedback.expressionScore).label('avg_expr'),
        func.avg(models.CourseFeedback.activityScore).label('avg_act'),
        func.count(models.CourseFeedback.id).label('student_count')
    ).filter(models.CourseFeedback.courseName == course_name).first()

    # 边界防御 1：数据库没这门课的数据
    if not result or not result.student_count or result.student_count == 0:
        return {"report": "⚠️ 数据库中暂无该课程的有效数据，无法进行 AI 诊断。"}

    # 2. 固化结构化 Prompt，杜绝大模型乱发挥
    prompt = f"""
    作为企业培训诊断专家，根据以下真实打分数据，为《{course_name}》课程出具一份简明扼要的深度诊断报告。
    
    【客观数据】
    - 参评人数：{result.student_count}人
    - 总体满意度：{round(result.avg_sat, 1)} / 5.0
    - 5维细分(满分100)：教学质量({round(result.avg_teach, 1)})、内容实用({round(result.avg_prac, 1)})、节奏把控({round(result.avg_pace, 1)})、讲师表达({round(result.avg_expr, 1)})、活动设计({round(result.avg_act, 1)})
    
    【输出要求】
    直接输出分析，禁止客套话。必须包含以下3个模块（使用Markdown加粗）：
    1. **核心指标汇总**：一句话概括整体表现。
    2. **优势与短板洞察**：根据最高分和最低分项进行归因。
    3. **优化建议**：给出2条具体可执行的落地建议。
    """

    # 3. 阻塞式调用大模型
    try:
        response = ai_client.chat.completions.create(
            model="deepseek-chat", # 依据你的 base_url 更改模型名
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3, # 低温度保证诊断报告的专业性和稳定性
            max_tokens=800,
            timeout=15 # 边界防御 2：强制 15 秒超时熔断，防止后端卡死
        )
        report = response.choices[0].message.content
        return {"report": report}
    except Exception as e:
        logger.error(f"AI 调用异常: {str(e)}")
        # 边界防御 3：友好兜底，绝不抛出 500 导致前端白屏
        return {"report": "⚠️ AI 诊断引擎当前繁忙或 API 密钥未配置，请稍后再试。"}


@app.post("/api/ai/recommendation")
def get_host_recommendation(request: HostRecommendationRequest):
    """
    一次性返回多主播互补诊断报告 (DeepSeek 驱动)
    三维边界防御：拦截单主播、拦截超时、结构化固定输出
    
    前端发送格式：
    {
      "hostA": {
        "name": "Jayson",
        "scores": [85.0, 75.0, 60.0, 80.0, 70.0],
        "strengths": ["互动能力强", "转化能力强"],
        "weaknesses": ["留存时间较短"]
      },
      "hostB": {
        "name": "Tracy",
        "scores": [70.0, 65.0, 80.0, 75.0, 85.0],
        "strengths": ["内容吸引力强"],
        "weaknesses": ["互动率待提升"]
      }
    }
    """
    # 验证scores数组长度是否为5
    hostA_scores = request.hostA.get('scores', [])
    hostB_scores = request.hostB.get('scores', [])
    
    if len(hostA_scores) != 5 or len(hostB_scores) != 5:
        return {
            "success": False,
            "error": "scores数组长度必须为5（五维评分）",
            "hostA_scores_length": len(hostA_scores),
            "hostB_scores_length": len(hostB_scores)
        }
    
    # 1. 提取前端传来的真实主播数据，组装成文本
    hosts_info = ""
    
    hostA_name = request.hostA.get('name', '未知主播A')
    hostA_strengths = ', '.join(request.hostA.get('strengths', []))
    hostA_weaknesses = ', '.join(request.hostA.get('weaknesses', []))
    hosts_info += f"- 主播【{hostA_name}】: 优势为 {hostA_strengths}；短板为 {hostA_weaknesses}。\n"
    
    hostB_name = request.hostB.get('name', '未知主播B')
    hostB_strengths = ', '.join(request.hostB.get('strengths', []))
    hostB_weaknesses = ', '.join(request.hostB.get('weaknesses', []))
    hosts_info += f"- 主播【{hostB_name}】: 优势为 {hostB_strengths}；短板为 {hostB_weaknesses}。\n"

    # 2. 固化结构化 Prompt
    prompt = f"""
    作为顶级直播运营总监，请分析以下两位主播的互补组合策略：
    {hosts_info}
    
    请直接输出分析，禁止客套话。必须严格以 JSON 格式返回，包含两个字段：
    1. "recommendation": 详细分析他们组合直播的优势（比如流量互洗、专业与氛围互补等），一段话即可。
    2. "expectedImprovement": 预测该组合能带来的核心数据提升（如转化率、留存率），一句话概括。
    
    必须且只能返回合法的 JSON 字符串，例如：{{"recommendation": "...", "expectedImprovement": "..."}}
    """

    # 3. 阻塞式调用 DeepSeek 大模型
    try:
        response = ai_client.chat.completions.create(
            model="deepseek-chat",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=600,
            timeout=15
        )
        report_text = response.choices[0].message.content
        
        # 清理可能存在的 markdown 代码块标记
        report_text = report_text.replace("```json", "").replace("```", "").strip()
        result_json = json.loads(report_text)
        
        return {
            "success": True,
            "recommendation": result_json.get("recommendation", "互补优势分析已生成。"),
            "expectedImprovement": result_json.get("expectedImprovement", "预期提升整体直播间转化数据。")
        }
    except json.JSONDecodeError as e:
        logger.error(f"JSON解析异常: {str(e)}")
        logger.error(f"原始响应: {report_text}")
        return {
            "success": False,
            "error": "AI返回格式异常，请稍后重试",
            "raw_response": report_text[:200] if report_text else ""
        }
    except Exception as e:
        logger.error(f"DeepSeek 调用异常: {str(e)}")
        # 兜底防御
        return {
            "success": False,
            "error": f"AI引擎调用失败: {str(e)}",
            "recommendation": None,
            "expectedImprovement": None
        }


# ==========================================
# 终极数据接口：融合直播CSV分析与课程分析
# ==========================================
@app.get("/api/analysis/dashboard")
def get_analysis_dashboard(db: Session = Depends(get_db)):
    """
    分析页面接口 - 主播对比 + 词云数据
    返回真实统计数据，数据单位为k（千人）
    """
    import os, glob, pandas as pd
    res = {"success": False, "hosts": [], "hostMetrics": {}, "wordCloudData": {}}
    
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        files = glob.glob(os.path.join(base_dir, "uploads", "*直播*.xlsx"))
        
        if not files:
            return res
        
        latest = max(files, key=os.path.getmtime)
        df = pd.read_excel(latest)
        df.columns = df.columns.str.strip()
        
        # 数据清洗
        if '累计观看人数' in df.columns:
            df['累计观看人数'] = pd.to_numeric(df['累计观看人数'], errors='coerce').fillna(0)
        else:
            df['累计观看人数'] = 0
        
        if '人均观看时长' in df.columns:
            df['留存时长'] = df['人均观看时长'].apply(parse_watch_time)
        else:
            df['留存时长'] = 5.0
        
        if '关注率' in df.columns:
            df['关注率'] = pd.to_numeric(df['关注率'], errors='coerce').fillna(0) * 100
        else:
            df['关注率'] = 5.0
        
        if '互动率' in df.columns:
            df['互动率'] = pd.to_numeric(df['互动率'], errors='coerce').fillna(0) * 100
        else:
            df['互动率'] = 10.0
        
        if '最高在线人数' in df.columns:
            df['最高在线人数'] = pd.to_numeric(df['最高在线人数'], errors='coerce').fillna(0)
        else:
            df['最高在线人数'] = df['累计观看人数'] * 0.1
        
        # 处理多主播
        df['主播'] = df['主播'].astype(str).str.split('&')
        df = df.explode('主播')
        df['主播'] = df['主播'].str.strip()
        
        # 主播名称标准化
        def normalize_host_name(name):
            name = str(name).strip()
            if 'vivi' in name.lower():
                return 'Vivi老师'
            if name and name[0].isalpha():
                return name.capitalize()
            return name
        
        df['主播'] = df['主播'].apply(normalize_host_name)
        
        # 按主播聚合
        host_stats = df.groupby('主播').agg({
            '累计观看人数': ['mean', 'sum', 'count'],
            '最高在线人数': ['mean', 'max'],
            '留存时长': 'mean',
            '互动率': 'mean',
            '关注率': 'mean'
        }).reset_index()
        
        host_stats.columns = ['主播', 'avg_viewers', 'total_viewers', 'live_count', 
                              'avg_peak', 'max_peak', 'retention', 'interaction', 'fans_rate']
        
        # Min-Max归一化
        def normalize_series(series):
            min_val = series.min()
            max_val = series.max()
            if max_val == min_val:
                return pd.Series([80] * len(series))
            return round(60 + 40 * ((series - min_val) / (max_val - min_val)))
        
        host_stats['score_traffic'] = normalize_series(host_stats['avg_viewers'])
        host_stats['score_retention'] = normalize_series(host_stats['retention'])
        host_stats['score_peak'] = normalize_series(host_stats['avg_peak'])
        host_stats['score_interaction'] = normalize_series(host_stats['interaction'])
        host_stats['score_fans'] = normalize_series(host_stats['fans_rate'])
        
        # 组装数据
        for _, row in host_stats.iterrows():
            host_name = str(row['主播'])
            
            # 过滤无效主播
            if host_name.lower() in ['未知', '', '测试', 'none', 'null', 'nan']:
                continue
            
            # 优劣势分析
            strengths = []
            weaknesses = []
            
            if row['score_traffic'] >= 85:
                strengths.append("流量吸引力强")
            elif row['score_traffic'] <= 65:
                weaknesses.append("流量获取待加强")
            
            if row['score_retention'] >= 85:
                strengths.append("用户留存极高")
            elif row['score_retention'] <= 65:
                weaknesses.append("用户留存待提升")
            
            if row['score_peak'] >= 85:
                strengths.append("人气爆发力强")
            elif row['score_peak'] <= 65:
                weaknesses.append("人气峰值待突破")
            
            if row['score_interaction'] >= 85:
                strengths.append("互动氛围活跃")
            elif row['score_interaction'] <= 70:
                weaknesses.append("互动引导需加强")
            
            if row['score_fans'] >= 85:
                strengths.append("粉丝转化高效")
            elif row['score_fans'] <= 70:
                weaknesses.append("关注转化待优化")
            
            if not strengths:
                strengths.append("综合表现均衡")
            if not weaknesses:
                weaknesses.append("暂无明显短板")
            
            scores = [
                int(row['score_traffic']),
                int(row['score_retention']),
                int(row['score_peak']),
                int(row['score_interaction']),
                int(row['score_fans'])
            ]
            
            res["hosts"].append({
                "id": host_name,
                "name": host_name,
                "strengths": strengths[:3],
                "weaknesses": weaknesses[:2]
            })
            
            res["hostMetrics"][host_name] = {
                "name": host_name,
                "scores": scores,
                "avgViewers": round(row['avg_viewers'] / 1000, 1),
                "totalViewers": round(row['total_viewers'] / 1000, 1),
                "liveCount": int(row['live_count']),
                "retention": round(row['retention'], 1),
                "interaction": round(row['interaction'], 1),
                "fansRate": round(row['fans_rate'], 1)
            }
        
        # 词云数据生成
        try:
            reviews = db.query(models.CourseFeedback.courseName, models.CourseFeedback.studentReview).filter(
                models.CourseFeedback.studentReview.isnot(None)
            ).all()
            
            if reviews:
                stopwords = set([
                    '非常', '比较', '大部分', '个别', '略显', '地方', '能', '可以', '都', '的', '了', '是', '在', '有', '和', '与', '或', '但', '而', '这', '那', '我', '你', '他', '她', '它', '们', '自己', '什么', '怎么', '如何', '为什么', '哪', '哪里', '哪个', '多少', '几', '很', '太', '更', '最', '极', '特别', '尤其', '甚至', '才', '就', '只', '又', '再', '也', '还', '已经', '正在', '将要', '应该', '必须', '可能', '大概', '也许', '一定', '确实', '真的', '真是', '听懂', '语言', '理解', '容易', '一些', '一点', '有些', '很多', '不少', '许多', '各种', '各个', '每个', '所有', '任何', '其他', '另外', '此外', '而且', '并且', '或者', '以及', '因为', '所以', '如果', '虽然', '但是', '然而', '不过', '只是', '就是', '还是', '或者', '比如', '例如', '譬如', '来说', '而言', '对于', '关于', '通过', '根据', '按照', '依据', '由于', '鉴于', '基于', '为了', '以便', '以免', '使得', '让', '把', '被', '给', '向', '从', '到', '对', '于', '之', '其', '此', '彼', '者', '等', '等等', '之类', '一样', '一般', '一种', '一个', '这个', '那个', '这些', '那些', '这样', '那样', '怎样', '多么', '多少', '几时', '何时', '哪里', '何处', '何人', '何物', '何事', '何故'
                ])
                
                course_texts = {}
                for r in reviews:
                    c_name = r[0] if r[0] else "未知课程"
                    text = r[1]
                    if isinstance(text, str) and text.strip():
                        if c_name not in course_texts:
                            course_texts[c_name] = []
                        course_texts[c_name].append(text)
                
                for c_name, texts in course_texts.items():
                    text_corpus = " ".join(texts)
                    try:
                        tags = jieba.analyse.extract_tags(text_corpus, topK=50, withWeight=True)
                        filtered_tags = []
                        for tag in tags:
                            word = tag[0]
                            weight = tag[1]
                            if word not in stopwords and len(word) > 1:
                                filtered_tags.append({
                                    "name": word,
                                    "value": int(weight * 100) + 5
                                })
                            if len(filtered_tags) >= 20:
                                break
                        
                        if not filtered_tags:
                            filtered_tags = [{"name": "暂无有效关键词", "value": 10}]
                        
                        res["wordCloudData"][c_name] = filtered_tags
                    except Exception as e:
                        logger.error(f"课程 {c_name} 分词异常: {e}")
                        res["wordCloudData"][c_name] = [{"name": "分词异常", "value": 10}]
        except Exception as e:
            logger.error(f"词云生成异常: {e}")
        
        res["success"] = True
        
    except Exception as e:
        logger.error(f"分析接口异常: {e}")
    
    return res


# ==========================================
# 终极数据接口：全自动生成直播运营面板 (多主播雷达与画像)
# ==========================================

@app.get("/api/analysis/live_dashboard")
def get_live_dashboard_analysis():
    """
    读取本地 CSV 直播数据，执行 Min-Max 归一化算法，
    动态生成 5 维雷达图与主播优劣势画像
    """
    import os, glob
    try:
        # 1. 动态定位最新上传的文件
        base_dir = os.path.dirname(os.path.abspath(__file__))
        files = glob.glob(os.path.join(base_dir, "uploads", "*.*"))
        if not files:
            return {"success": False, "hosts": [], "hostMetrics": {}}
        
        latest = max(files, key=os.path.getmtime)
        df = pd.read_excel(latest) if latest.endswith('.xlsx') else pd.read_csv(latest, encoding='gbk')
        df.columns = df.columns.str.strip()
        
        # 2. 数据清洗与转化 - 使用实际存在的列，缺失列使用默认值
        # 流量引力：累计观看人数
        if '累计观看人数' in df.columns:
            df['累计观看人数'] = pd.to_numeric(df['累计观看人数'], errors='coerce').fillna(0)
        else:
            df['累计观看人数'] = 0
        
        # 人气峰值：最高在线人数（可能不存在，使用累计观看人数的10%作为估算）
        if '最高在线人数' in df.columns:
            df['最高在线人数'] = pd.to_numeric(df['最高在线人数'], errors='coerce').fillna(0)
        else:
            df['最高在线人数'] = df['累计观看人数'] * 0.1
        
        # 圈粉转化：关注率（可能不存在，使用默认值）
        if '关注率' in df.columns:
            df['关注率'] = pd.to_numeric(df['关注率'], errors='coerce').fillna(0)
            df['关注率'] = df['关注率'] * 100
        else:
            df['关注率'] = 5.0
        
        # 互动氛围：互动率（可能不存在，使用默认值）
        if '互动率' in df.columns:
            df['互动率'] = pd.to_numeric(df['互动率'], errors='coerce').fillna(0)
            df['互动率'] = df['互动率'] * 100
        else:
            df['互动率'] = 10.0
        
        # 留存把控：人均观看时长
        if '人均观看时长' in df.columns:
            df['留存时长'] = df['人均观看时长'].apply(parse_watch_time)
        else:
            df['留存时长'] = 5.0  # 默认5分钟

        # 边界防御：处理"Vivi老师&Tracy"这种多主播同场的情况
        df['主播'] = df['主播'].astype(str).str.split('&')
        df = df.explode('主播')
        df['主播'] = df['主播'].str.strip()
        
        # 主播名称标准化 - 确保大小写一致
        def normalize_host_name(name):
            name = str(name).strip()
            # 统一Vivi老师的写法
            if 'vivi' in name.lower():
                return 'Vivi老师'
            # 首字母大写
            if name and name[0].isalpha():
                return name.capitalize()
            return name
        
        df['主播'] = df['主播'].apply(normalize_host_name)

        # 3. 按主播进行聚合（包含更多统计数据）
        host_stats = df.groupby('主播').agg({
            '累计观看人数': ['mean', 'sum', 'count'],
            '最高在线人数': ['mean', 'max'],
            '留存时长': 'mean',
            '互动率': 'mean',
            '关注率': 'mean'
        }).reset_index()
        
        # 扁平化列名
        host_stats.columns = ['主播', 'avg_viewers', 'total_viewers', 'live_count', 
                              'avg_peak', 'max_peak', 'retention', 'interaction', 'fans_rate']

        # 4. 执行 Min-Max 归一化
        def normalize_series(series):
            min_val = series.min()
            max_val = series.max()
            if max_val == min_val:
                return pd.Series([80] * len(series))
            return round(60 + 40 * ((series - min_val) / (max_val - min_val)))

        # 对应雷达图顺序: [流量引力, 留存把控, 人气峰值, 互动氛围, 圈粉转化]
        host_stats['score_traffic'] = normalize_series(host_stats['avg_viewers'])
        host_stats['score_retention'] = normalize_series(host_stats['retention'])
        host_stats['score_peak'] = normalize_series(host_stats['avg_peak'])
        host_stats['score_interaction'] = normalize_series(host_stats['interaction'])
        host_stats['score_fans'] = normalize_series(host_stats['fans_rate'])

        # 5. 组装前端需要的 DashboardData 数据结构
        hosts_profile = []
        host_metrics = {}

        for _, row in host_stats.iterrows():
            host_name = str(row['主播'])
            # 使用主播名称作为 ID
            host_id = host_name
            
            scores = [
                int(row['score_traffic']), 
                int(row['score_retention']),
                int(row['score_peak']), 
                int(row['score_interaction']), 
                int(row['score_fans'])
            ]
            
            # 基于真实数据的优劣势分析
            strengths = []
            weaknesses = []
            
            # 流量分析
            if row['score_traffic'] >= 90:
                strengths.append("流量吸引力强")
            elif row['score_traffic'] >= 80:
                strengths.append("流量表现良好")
            elif row['score_traffic'] <= 65:
                weaknesses.append("流量获取待加强")
            
            # 留存分析
            if row['score_retention'] >= 90:
                strengths.append("用户留存极高")
            elif row['score_retention'] >= 80:
                strengths.append("留存能力良好")
            elif row['score_retention'] <= 65:
                weaknesses.append("用户留存待提升")
            
            # 峰值分析
            if row['score_peak'] >= 90:
                strengths.append("人气爆发力强")
            elif row['score_peak'] >= 80:
                strengths.append("人气表现稳定")
            elif row['score_peak'] <= 65:
                weaknesses.append("人气峰值待突破")
            
            # 互动分析
            if row['score_interaction'] >= 85:
                strengths.append("互动氛围活跃")
            elif row['score_interaction'] <= 70:
                weaknesses.append("互动引导需加强")
            
            # 转化分析
            if row['score_fans'] >= 85:
                strengths.append("粉丝转化高效")
            elif row['score_fans'] <= 70:
                weaknesses.append("关注转化待优化")
            
            # 兜底
            if not strengths: 
                strengths.append("综合表现均衡")
            if not weaknesses: 
                weaknesses.append("暂无明显短板")

            # 个人看板总结（客观中肯）
            avg_score = sum(scores) / 5
            avg_viewers_k = round(row['avg_viewers'] / 1000, 1)
            total_viewers_k = round(row['total_viewers'] / 1000, 1)
            
            if avg_score >= 85:
                summary = f"主播{host_name}整体表现优秀，场均观看{avg_viewers_k}k人，平均留存{round(row['retention'], 1)}分钟，直播{int(row['live_count'])}场，累计观看{total_viewers_k}k人次。"
            elif avg_score >= 75:
                summary = f"主播{host_name}表现良好，场均观看{avg_viewers_k}k人，平均留存{round(row['retention'], 1)}分钟，直播{int(row['live_count'])}场。建议持续优化内容质量。"
            else:
                summary = f"主播{host_name}有提升空间，场均观看{avg_viewers_k}k人，平均留存{round(row['retention'], 1)}分钟，直播{int(row['live_count'])}场。建议加强引流与互动策略。"

            hosts_profile.append({
                "id": host_id,
                "name": host_name,
                "strengths": strengths[:3],
                "weaknesses": weaknesses[:2],
                "summary": summary,
                "liveCount": int(row['live_count']),
                "avgViewers": avg_viewers_k,
                "totalViewers": total_viewers_k,
                "avgRetention": round(row['retention'], 1)
            })
            
            host_metrics[host_id] = {
                "name": host_name,
                "scores": scores,
                "avgViewers": avg_viewers_k,
                "totalViewers": total_viewers_k,
                "liveCount": int(row['live_count']),
                "avgPeak": round(row['avg_peak'] / 1000, 1),
                "maxPeak": round(row['max_peak'] / 1000, 1),
                "retention": round(row['retention'], 1),
                "interaction": round(row['interaction'], 1),
                "fansRate": round(row['fans_rate'], 1)
            }

        # 生成七日趋势数据
        df['直播日期'] = df['直播日期'].apply(data_processor.parse_smart_date)
        recent_data = df[df['直播日期'].notna()].sort_values('直播日期').tail(7)
        
        trend_dates = []
        trend_values = []
        
        for _, row in recent_data.iterrows():
            if pd.notna(row['直播日期']):
                trend_dates.append(row['直播日期'].strftime('%m-%d'))
                trend_values.append(round(row['累计观看人数'] / 1000, 1))

        return {
            "success": True,
            "hosts": hosts_profile,
            "hostMetrics": host_metrics,
            "trend": {
                "dates": trend_dates,
                "values": trend_values
            }
        }
        
    except Exception as e:
        logger.error(f"直播数据分析引擎异常: {str(e)}")
        return {"success": False, "hosts": [], "hostMetrics": {}}


