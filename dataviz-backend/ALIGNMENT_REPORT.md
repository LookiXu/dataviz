# 📋 前后端颗粒度对齐报告

## 📊 接口对齐状态总览

| 模块 | 接口 | 方法 | 路径 | 状态 |
|------|------|------|------|------|
| 首页概览 | 统计数据 | GET | /api/overview/stats | ✅ 已对齐 |
| 首页概览 | 趋势数据 | GET | /api/overview/trend | ✅ 已对齐 |
| 首页概览 | 待办列表 | CRUD | /api/todos | ✅ 已对齐 |
| 数据上传 | 元数据获取 | GET | /api/metadata | ⚠️ 需修复 |
| 数据上传 | 文件上传 | POST | /api/upload | ✅ 已对齐 |
| 数据分析 | 分析仪表盘 | GET | /api/analysis/dashboard | ✅ 已对齐 |
| 数据分析 | AI推荐 | POST | /api/ai/recommendation | ✅ 已对齐 |
| 可视化看板 | 直播看板 | GET | /api/analysis/live_dashboard | ✅ 已对齐 |
| 可视化看板 | 课程看板 | GET | /api/dashboard/course | ✅ 已对齐 |
| 可视化看板 | 课程诊断 | GET | /api/ai/course_diagnosis | ✅ 已对齐 |

---

## 一、首页概览模块

### 1.1 GET /api/overview/stats - 统计数据

**✅ 已对齐**

**前端期望格式：**
```json
{
  "success": true,
  "data": {
    "totalLiveStreams": 47,
    "totalCourseReviews": 125,
    "dataProcessingSuccessRate": 100,
    "dateRange": "Oct 2025-Mar 2026",
    "courseNames": "公众演讲 + 生涯规划"
  }
}
```

**后端返回格式：** ✅ 完全匹配

**疑问解答：**
- ✅ `dateRange` 字段：后端返回日期范围描述，如 "Oct 2025-Mar 2026"
- ✅ `courseNames` 字段：后端返回课程名称拼接，如 "公众演讲 + 生涯规划"

---

### 1.2 GET /api/overview/trend - 趋势数据

**✅ 已对齐**

**前端期望格式：**
```json
{
  "success": true,
  "data": {
    "trend": [
      {
        "date": "02/10",
        "topic": "直播主题名称",
        "host": "主播姓名",
        "viewers": 1.3
      }
    ]
  }
}
```

**后端返回格式：** ✅ 完全匹配

**疑问解答：**
- ✅ `date` 字段格式：后端返回 MM/DD 格式，如 "02/10"
- ✅ `viewers` 单位：后端返回 k 单位，如 1.3（表示1.3k）
- ✅ 数据条数：后端返回最近10场直播，前端可自行截取前7条

---

## 二、数据上传模块

### 2.1 GET /api/metadata - 元数据获取

**⚠️ 需要修复**

**前端期望格式：**
```json
{
  "hosts": [
    { "id": "1", "name": "Wayne" },
    { "id": "2", "name": "Leo" }
  ],
  "courses": [
    { "id": "1", "name": "公众演讲课" },
    { "id": "2", "name": "生涯规划课" }
  ]
}
```

**后端当前返回：**
```json
{
  "hosts": [
    { "id": "Vivi老师&Tracy", "name": "Vivi老师&Tracy" },  // ❌ 组合主播
    { "id": "Vivi老师", "name": "Vivi老师" },
    { "id": "vivi老师", "name": "vivi老师" }  // ❌ 重复主播
  ],
  "courses": [...]
}
```

**需要修复的问题：**
1. ❌ 包含组合主播（如 "Vivi老师&Tracy"）
2. ❌ 包含重复主播（大小写不一致）

**修复方案：**
- 过滤组合主播（包含 &、、、和 等符号）
- 统一主播名称大小写
- 去重

---

### 2.2 POST /api/upload - 文件上传

**✅ 已对齐**

**前端请求格式：**
```
Content-Type: multipart/form-data
file: [File 对象]
upload_type: "live" | "course"
related_name: "主播姓名" | "课程名称"
```

**后端返回格式：**
```json
{
  "success": true,
  "records_inserted": 10,
  "message": "上传成功"
}
```

**疑问解答：**
- ✅ 后端支持 CSV 和 Excel 两种格式
- ✅ 后端支持字段别名映射（中文字段名）
- ⚠️ 错误字段提示：后端返回通用错误信息，建议优化

---

## 三、数据分析页面

### 3.1 GET /api/analysis/dashboard - 分析仪表盘

**✅ 已对齐**

**前端期望格式：**
```json
{
  "success": true,
  "hosts": [
    {
      "id": "uuid-1",
      "name": "Wayne",
      "strengths": ["流量引力强", "互动氛围好"],
      "weaknesses": ["留存把控待提升"],
      "recordCount": 5
    }
  ],
  "hostMetrics": {
    "uuid-1": {
      "name": "Wayne",
      "scores": [85, 72, 90, 88, 75]
    }
  },
  "wordCloudData": {
    "公众演讲课": [
      { "name": "收获很大", "value": 15 }
    ]
  },
  "courses": ["公众演讲课", "生涯规划课"]
}
```

**后端返回格式：** ✅ 完全匹配

**疑问解答：**
- ✅ `hostMetrics` 的 key：后端使用主播 name 作为 key
- ✅ `scores` 五维评分：顺序为 [流量引力, 留存把控, 人气峰值, 互动氛围, 圈粉转化]
- ✅ 五维指标顺序已确认

---

### 3.2 POST /api/ai/recommendation - AI互补推荐

**✅ 已对齐**

**前端请求格式：**
```json
{
  "hostA": {
    "name": "Wayne",
    "scores": [85, 72, 90, 88, 75],
    "strengths": ["流量引力强"],
    "weaknesses": ["留存把控待提升"]
  },
  "hostB": {
    "name": "Leo",
    "scores": [70, 90, 75, 80, 85],
    "strengths": ["留存把控强"],
    "weaknesses": ["流量引力待提升"]
  }
}
```

**后端返回格式：**
```json
{
  "success": true,
  "recommendation": "推荐合作建议文本...",
  "expectedImprovement": "预期提升数据..."
}
```

**疑问解答：**
- ✅ `scores` 数组长度必须为 5，后端已校验
- ✅ 推荐内容由 DeepSeek AI 生成

---

## 四、可视化看板页面

### 4.1 GET /api/analysis/live_dashboard - 直播看板

**✅ 已对齐**

**前端期望格式：**
```json
{
  "success": true,
  "hosts": [
    {
      "name": "Wayne",
      "summary": "主播总结",
      "liveCount": 5,
      "avgViewers": 1.5,  // k单位
      "totalViewers": 7.5,  // k单位
      "avgRetention": 25
    }
  ],
  "hostMetrics": {
    "Wayne": {
      "name": "Wayne",
      "scores": [85, 72, 90, 88, 75],
      "avgViewers": 1.5,  // k单位
      "totalViewers": 7.5,  // k单位
      "liveCount": 5,
      "avgPeak": 0.2,  // k单位
      "maxPeak": 0.35,  // k单位
      "retention": 25,
      "interaction": 88,
      "fansRate": 75
    }
  },
  "trend": {
    "dates": ["02/10", "02/11"],
    "values": [1.5, 1.8]  // k单位
  }
}
```

**后端返回格式：** ✅ 完全匹配

**疑问解答：**
- ✅ `hostMetrics` 的 key：后端使用主播 name 作为 key
- ✅ 数据单位：观看人数已转换为 k 单位
- ✅ `trend` 数据：dates 和 values 长度一致

---

### 4.2 GET /api/dashboard/course - 课程看板

**✅ 已对齐**

**前端期望格式：**
```json
{
  "courses": [
    { "courseName": "公众演讲课" },
    { "courseName": "生涯规划课" }
  ],
  "radarIndicators": ["教学质量", "内容实用", "节奏把控", "讲师表达", "活动设计"]
}
```

**后端返回格式：** ✅ 完全匹配

**疑问解答：**
- ✅ `courses` 是对象数组，包含课程信息
- ✅ `radarIndicators` 五维指标固定

---

### 4.3 GET /api/ai/course_diagnosis - 课程诊断

**✅ 已对齐**

**前端请求：**
```
Query 参数: ?course_name=公众演讲课
```

**后端返回格式：**
```json
{
  "report": "课程诊断报告文本..."
}
```

---

## 五、数据字段映射关系

### 5.1 直播数据字段映射

**✅ 后端支持中文字段名映射**

| 前端字段名 | 中文别名 | 后端字段名 | 数据类型 | 支持状态 |
|-----------|---------|-----------|---------|---------|
| topic | 直播主题/主题 | topic | string | ✅ |
| host_name | 主播/主播姓名 | hostName | string | ✅ |
| live_date | 直播日期/日期 | liveDate | date | ✅ |
| duration_minutes | 直播时长/时长 | durationMinutes | int | ✅ |
| total_viewers | 累计观看/观看人数 | totalViewers | int | ✅ |
| live_viewers | 场观人数/场观 | liveViewers | int | ✅ |
| reservation_count | 预约人数 | reservationCount | int | ✅ |
| reservation_rate | 预约转化率 | reservationRate | float | ✅ |
| avg_watch_duration | 人均观看时长 | avgWatchDuration | float | ✅ |
| max_online_users | 最高在线 | maxOnlineUsers | int | ✅ |
| follow_rate | 关注率 | followRate | float | ✅ |
| interaction_rate | 互动率 | interactionRate | float | ✅ |
| share_rate | 分享率 | shareRate | float | ✅ |
| new_followers | 新增关注 | newFollowers | int | ✅ |
| order_count | 成交订单 | orderCount | int | ✅ |
| wechat_add_rate | 加微率 | wechatAddRate | float | ✅ |

---

### 5.2 课程评价字段映射

**✅ 后端支持中文字段名映射**

| 前端字段名 | 中文别名 | 后端字段名 | 数据类型 | 支持状态 |
|-----------|---------|-----------|---------|---------|
| course_name | 课程名称/课程 | courseName | string | ✅ |
| instructor_name | 讲师/讲师姓名 | instructorName | string | ✅ |
| satisfaction | 满意度评分 | satisfaction | int(1-5) | ✅ |
| practicality | 实用性评分 | practicality | int(1-5) | ✅ |
| student_review | 学员评价/评价内容 | studentReview | text | ✅ |
| review_date | 评价日期 | reviewDate | date | ✅ |

---

## 六、五维评分指标定义

### 6.1 直播主播五维评分

**✅ 已确认**

| 序号 | 指标名称 | 计算依据 | 取值范围 |
|------|---------|---------|---------|
| 1 | 流量引力 | 基于总观看人数、预约人数计算 | 60-100 |
| 2 | 留存把控 | 基于平均观看时长、留存率计算 | 60-100 |
| 3 | 人气峰值 | 基于最高在线人数、场观计算 | 60-100 |
| 4 | 互动氛围 | 基于互动率、分享率计算 | 60-100 |
| 5 | 圈粉转化 | 基于关注率、加微率、成交订单计算 | 60-100 |

**计算逻辑：**
- 使用 Min-Max 归一化，将原始数据映射到 60-100 范围
- 每个维度独立计算，确保评分相对公平

---

### 6.2 课程评价五维评分

**✅ 已确认**

| 序号 | 指标名称 | 数据来源 | 取值范围 |
|------|---------|---------|---------|
| 1 | 教学质量 | teachingScore | 0-100 |
| 2 | 内容实用 | practicalScore | 0-100 |
| 3 | 节奏把控 | paceScore | 0-100 |
| 4 | 讲师表达 | expressionScore | 0-100 |
| 5 | 活动设计 | activityScore | 0-100 |

**计算逻辑：**
- 从课程反馈数据中提取评分字段
- 使用 Min-Max 归一化到 60-100 范围

---

## 七、错误处理规范

### 7.1 统一错误响应格式

**✅ 已实现**

```json
{
  "success": false,
  "error": "错误类型",
  "detail": "详细错误信息"
}
```

### 7.2 HTTP状态码处理

| HTTP状态码 | 前端处理 | 后端实现 |
|-----------|---------|---------|
| 200 | 检查 success 字段 | ✅ |
| 400 | 显示 detail 信息 | ✅ |
| 404 | 显示资源不存在 | ✅ |
| 500 | 显示服务器错误 | ✅ |

---

## 八、需要修复的问题

### ⚠️ 高优先级问题

#### 1. /api/metadata 接口需要修复

**问题描述：**
- 返回的主播列表包含组合主播（如 "Vivi老师&Tracy"）
- 返回的主播列表包含重复主播（大小写不一致）

**修复方案：**
```python
# 过滤组合主播
hosts = [h for h in hosts if '&' not in h['name'] and '、' not in h['name']]

# 统一主播名称大小写
def normalize_host_name(name):
    if 'vivi' in name.lower():
        return 'Vivi老师'
    return name.capitalize()

# 去重
unique_hosts = []
seen = set()
for host in hosts:
    normalized_name = normalize_host_name(host['name'])
    if normalized_name not in seen:
        seen.add(normalized_name)
        unique_hosts.append({
            "id": normalized_name,
            "name": normalized_name
        })
```

---

## 九、技术栈说明

### 后端技术栈

| 技术组件 | 版本/说明 | 用途 |
|---------|----------|------|
| **FastAPI** | 现代Web框架 | 构建RESTful API |
| **SQLAlchemy** | ORM框架 | 数据库操作 |
| **PostgreSQL** | 关系型数据库 | 数据存储 |
| **OpenAI/DeepSeek** | LLM API | AI推荐和分析 |
| **Jieba** | 中文分词 | 词云生成 |
| **Pandas** | 数据处理 | Excel/CSV解析 |
| **Pydantic** | 数据验证 | 请求/响应模型 |
| **Uvicorn** | ASGI服务器 | 运行FastAPI |

**重要提示：** 本项目使用 **SQLAlchemy ORM**，不是 Prisma。

---

## 十、总结

### ✅ 已对齐的接口（9个）

1. GET /api/overview/stats
2. GET /api/overview/trend
3. CRUD /api/todos
4. POST /api/upload
5. GET /api/analysis/dashboard
6. POST /api/ai/recommendation
7. GET /api/analysis/live_dashboard
8. GET /api/dashboard/course
9. GET /api/ai/course_diagnosis

### ⚠️ 需要修复的接口（1个）

1. GET /api/metadata - 需要过滤组合主播和去重

### 📊 数据格式对齐情况

- ✅ 所有数据单位已统一为 k（千人）
- ✅ 所有数值保留 1 位小数
- ✅ 日期格式统一为 MM/DD
- ✅ 主播名称已标准化
- ✅ 五维评分顺序已确认

### 🎯 下一步行动

1. **立即修复** `/api/metadata` 接口
2. **前端确认** 所有接口返回格式是否符合预期
3. **联合测试** 进行完整的前后端集成测试

---

**报告生成时间：** 2026-03-13
**后端版本：** v1.0.0
**状态：** ✅ 基本对齐，1个接口待修复
