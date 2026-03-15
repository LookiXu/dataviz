# DataVizPro 后端接口文档

## 接口列表

### 1. 健康检查
- **接口**: `GET /health`
- **功能**: 检查后端服务状态
- **返回**: `{"status": "ok", "message": "..."}`

---

### 2. 文件上传
- **接口**: `POST /api/upload`
- **功能**: 上传直播或课程数据文件
- **参数**:
  - `file`: 上传的文件（Excel/CSV）
  - `upload_type`: "live" 或 "course"
  - `related_name`: 课程名称（upload_type=course时必填）
- **返回**: `{"message": "上传并处理成功", "records_inserted": 10}`

---

### 3. 直播看板（旧接口 - 数据库）
- **接口**: `GET /api/dashboard/live`
- **数据来源**: PostgreSQL数据库
- **功能**: 获取直播趋势图和主播列表
- **返回数据**:
  ```json
  {
    "trend": {
      "dates": ["02-10", "02-11", ...],
      "values": [1.3, 1.4, ...]
    },
    "streamer": [
      {"name": "Tracy", "hours": 0, "avgWatch": 0}
    ]
  }
  ```
- **⚠️ 问题**: 数据不完整，avgWatch都是0

---

### 4. 课程看板（数据库）
- **接口**: `GET /api/dashboard/course`
- **数据来源**: PostgreSQL数据库
- **功能**: 获取课程评价数据和雷达图分数
- **返回数据**:
  ```json
  {
    "courses": [
      {
        "courseName": "公众演讲",
        "avgScore": 4.5,
        "studentCount": 30,
        "radarScores": [85, 90, 80, 75, 88]
      }
    ],
    "radarIndicators": ["教学质量", "内容实用", "节奏把控", "讲师表达", "活动设计"]
  }
  ```

---

### 5. 元数据接口
- **接口**: `GET /api/metadata`
- **数据来源**: 数据库 + 默认列表
- **功能**: 获取主播和课程列表
- **返回数据**:
  ```json
  {
    "hosts": [{"id": "Tracy", "name": "Tracy"}],
    "courses": [{"id": "公众演讲", "name": "公众演讲"}]
  }
  ```

---

### 6. AI课程诊断
- **接口**: `GET /api/ai/course_diagnosis?course_name=公众演讲`
- **数据来源**: 数据库 + DeepSeek API
- **功能**: 生成课程AI诊断报告
- **返回数据**:
  ```json
  {
    "report": "**核心指标汇总**: ...\n**优势与短板洞察**: ...\n**优化建议**: ..."
  }
  ```

---

### 7. AI主播推荐（旧接口）
- **接口**: `POST /api/ai/recommendation`
- **数据来源**: 前端传入 + DeepSeek API
- **功能**: 分析主播互补组合
- **请求体**: `{"hosts": [{"name": "Tracy", "strengths": [...], "weaknesses": [...]}]}`
- **返回数据**:
  ```json
  {
    "success": true,
    "recommendation": "...",
    "expectedImprovement": "..."
  }
  ```

---

### 8. 综合分析看板（文件）
- **接口**: `GET /api/analysis/dashboard`
- **数据来源**: uploads文件夹中的最新文件
- **功能**: 获取主播列表和词云数据
- **返回数据**:
  ```json
  {
    "success": true,
    "hosts": [...],
    "hostMetrics": {...},
    "wordCloudData": {...}
  }
  ```

---

### 9. ⭐ 直播多维能力分析（核心接口）
- **接口**: `GET /api/analysis/live_dashboard`
- **数据来源**: uploads文件夹中的最新文件（实时读取）
- **功能**: 生成5维雷达图和主播画像
- **返回数据**:
  ```json
  {
    "success": true,
    "hosts": [
      {
        "id": "Tracy",
        "name": "Tracy",
        "strengths": ["流量吸引力强", "人气爆发力强"],
        "weaknesses": ["暂无明显短板"],
        "summary": "主播Tracy整体表现优秀...",
        "liveCount": 9,
        "avgViewers": 4153,
        "totalViewers": 37383,
        "avgRetention": 21.0
      }
    ],
    "hostMetrics": {
      "Tracy": {
        "name": "Tracy",
        "scores": [100, 73, 100, 60, 84],
        "avgViewers": 4153,
        "totalViewers": 37383,
        "liveCount": 9,
        "avgPeak": 919,
        "maxPeak": 1376,
        "retention": 21.0,
        "interaction": 34.5,
        "fansRate": 1.8
      }
    }
  }
  ```
- **雷达图维度顺序**:
  - [0] 流量引力
  - [1] 留存把控
  - [2] 人气峰值
  - [3] 互动氛围
  - [4] 圈粉转化

---

### 10. ⭐ AI主播互补推荐（增强版）
- **接口**: `POST /api/analysis/recommendation`
- **数据来源**: uploads文件夹 + DeepSeek API
- **功能**: 基于真实数据的AI互补分析
- **请求体**: `{"host_ids": ["Tracy", "Leo"]}`
- **返回数据**:
  ```json
  {
    "success": true,
    "hosts": [...],
    "recommendation": "综合分析...",
    "expectedImprovement": "预计转化率提升15-20%",
    "strategy": ["策略1", "策略2", "策略3"],
    "riskWarning": "潜在风险提示",
    "bestPractice": "最佳实践案例"
  }
  ```

---

## 数据处理方式对比

### 方式1：数据库存储（非实时）
- **接口**: `/api/dashboard/live`, `/api/dashboard/course`
- **流程**: 上传 → 处理 → 存入数据库 → 接口读取
- **优点**: 数据持久化，查询快速
- **缺点**: 需要上传后才能看到数据，不是实时处理

### 方式2：文件实时处理（实时）
- **接口**: `/api/analysis/live_dashboard`, `/api/analysis/recommendation`
- **流程**: 上传 → 保存文件 → 接口实时读取文件处理
- **优点**: 每次调用都读取最新文件，数据最新
- **缺点**: 文件IO开销，需要文件存在

---

## ⚠️ 当前存在的问题

### 问题1：上传接口没有保存文件到uploads文件夹
**现状**: 上传接口只保存到数据库，没有保存文件到uploads文件夹
**影响**: `/api/analysis/live_dashboard` 接口读取不到最新上传的文件
**解决方案**: 在上传接口中添加文件保存逻辑

### 问题2：两套数据源不一致
**现状**: 
- 旧接口从数据库读取（数据不完整）
- 新接口从文件读取（数据完整）

**影响**: 前端调用不同接口会得到不同数据
**解决方案**: 统一使用文件实时处理方式

---

## 前端需要调用的接口

### 推荐使用的新接口：
1. **直播多维能力图**: `GET /api/analysis/live_dashboard`
2. **AI主播推荐**: `POST /api/analysis/recommendation`
3. **课程看板**: `GET /api/dashboard/course`（这个接口数据完整）
4. **AI课程诊断**: `GET /api/ai/course_diagnosis`

### 不推荐使用的旧接口：
- ❌ `/api/dashboard/live` - 数据不完整
- ❌ `/api/ai/recommendation` - 功能较弱

---

## 数据实时性说明

### 实时处理（推荐）：
- `/api/analysis/live_dashboard` - 每次调用都读取最新文件
- `/api/analysis/recommendation` - 每次调用都读取最新文件

### 非实时处理：
- `/api/dashboard/live` - 读取数据库，需要先上传
- `/api/dashboard/course` - 读取数据库，需要先上传

---

## 建议的前端调用流程

1. **用户上传文件** → `POST /api/upload`
2. **获取主播列表** → `GET /api/analysis/live_dashboard`
3. **展示雷达图** → 使用 `hostMetrics[主播名].scores`
4. **展示主播画像** → 使用 `hosts` 数组
5. **AI互补分析** → `POST /api/analysis/recommendation`
