# DataVizPro - 直播课程数据分析平台

基于 **FastAPI + React + PostgreSQL** 的智能数据分析系统，提供直播数据统计、主播能力对比、AI智能推荐、课程评价分析等功能。

## 项目简介

DataVizPro 是一个面向直播教育行业的数据分析平台，通过智能化的数据处理和可视化展示，帮助管理者快速洞察直播效果、主播能力分布和课程质量，为运营决策提供数据支撑。

### 核心功能

- **数据总览**：实时统计直播场次、课程评价，动态展示趋势变化
- **数据上传**：支持 CSV/Excel 文件上传，智能字段映射
- **数据分析**：多主播能力对比（雷达图）、AI互补推荐
- **可视化看板**：直播趋势、主播排行、课程评价、评分分布
- **待办管理**：任务创建、状态跟踪、进度展示

## 技术栈

### 前端

| 技术 | 说明 |
|------|------|
| React 18 | 组件化 UI 框架 |
| TypeScript | 类型安全 |
| Vite | 快速构建工具 |
| Tailwind CSS | 原子化 CSS 框架 |
| shadcn/ui | 高质量 UI 组件库 |
| ECharts | 雷达图、词云可视化 |
| Recharts | 趋势图、柱状图 |

### 后端

| 技术 | 说明 |
|------|------|
| Python FastAPI | 高性能异步 Web 框架 |
| Uvicorn | ASGI 服务器 |
| SQLAlchemy | ORM 数据库操作 |
| PostgreSQL | 关系型数据库 |
| DeepSeek API | 大语言模型（AI推荐） |
| Pandas | 数据处理与分析 |
| Jieba | 中文分词（词云生成） |

## 项目结构

```
.
├── backend/                        # 后端服务
│   ├── app/
│   │   ├── api/                   # API 路由模块
│   │   │   ├── upload.py          # 数据上传接口
│   │   │   ├── analysis.py        # 数据分析接口
│   │   │   └── ai.py              # AI 推荐接口
│   │   ├── core/                  # 核心模块
│   │   │   ├── config.py          # 配置管理
│   │   │   ├── database.py        # 数据库连接
│   │   │   └── models.py          # 数据模型
│   │   └── utils/                 # 工具函数
│   │       └── data_processor.py  # 数据处理引擎
│   ├── main.py                    # 应用入口
│   └── requirements.txt           # Python 依赖
│
├── src/                           # 前端应用
│   ├── components/                # UI 组件
│   │   ├── ui/                    # 基础组件（shadcn/ui）
│   │   ├── dashboard/             # 看板组件
│   │   ├── stats-cards.tsx        # 统计卡片
│   │   ├── trend-chart.tsx        # 趋势图表
│   │   ├── radar-chart.tsx        # 雷达图
│   │   ├── word-cloud-chart.tsx   # 词云图
│   │   └── todo-list.tsx          # 待办列表
│   ├── pages/                     # 页面组件
│   │   ├── data-upload.tsx        # 数据上传页
│   │   ├── analysis.tsx           # 数据分析页
│   │   └── dashboard.tsx          # 可视化看板
│   ├── lib/                       # 工具库
│   │   ├── csv-validator.ts       # CSV 校验
│   │   └── logger.ts              # 日志工具
│   ├── App.tsx                    # 应用入口
│   └── main.tsx                   # 渲染入口
│
├── .env.development               # 开发环境配置
├── .env.production                # 生产环境配置
└── README.md                      # 项目文档
```

## 数据库设计

### LiveRecord（直播记录表）

存储直播核心指标数据。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| topic | String | 直播主题 |
| hostName | String | 主播姓名 |
| liveDate | Date | 直播日期 |
| totalViewers | Int | 累计观看人数 |
| avgWatchDuration | Float | 人均观看时长 |
| interactionRate | Float | 互动率 |
| ... | ... | 其他指标 |

### CourseFeedback（课程评价表）

存储学员对课程的评价数据。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| courseName | String | 课程名称 |
| instructorName | String | 讲师姓名 |
| satisfaction | Int | 满意度评分 |
| practicality | Int | 实用性评分 |
| studentReview | Text | 学员评价 |

### AISummary（AI 总结表）

存储 AI 生成的分析报告。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| liveRecordId | UUID | 关联直播记录 |
| courseFeedbackId | UUID | 关联课程评价 |
| summaryType | String | 总结类型 |
| summaryContent | Text | 总结内容 |

### Todo（待办任务表）

存储用户待办事项。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| title | String | 任务标题 |
| completed | Boolean | 完成状态 |
| priority | String | 优先级 |
| createdAt | DateTime | 创建时间 |

## API 接口

### 概览模块

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/overview/stats | 获取统计数据 |
| GET | /api/overview/trend | 获取趋势数据 |

### 上传模块

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/upload | 上传数据文件 |
| GET | /api/metadata | 获取主播/课程列表 |

### 分析模块

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/analysis/dashboard | 获取分析页数据 |
| GET | /api/analysis/live_dashboard | 获取直播看板数据 |

### 看板模块

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/dashboard/course | 获取课程看板数据 |

### AI 模块

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/ai/recommendation | AI 互补主播推荐 |
| POST | /api/ai/course_diagnosis | AI 课程诊断 |

### 待办模块

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/todos | 获取待办列表 |
| POST | /api/todos | 创建待办 |
| PUT | /api/todos/:id | 更新待办 |
| DELETE | /api/todos/:id | 删除待办 |

## 核心算法

### 1. 五维评分算法（Min-Max 归一化）

将主播各项指标归一化为 60-100 分：

```python
score = 60 + (value - min_value) / (max_value - min_value) * 40
```

五个维度：
- **流量引力**：累计观看人数
- **留存把控**：人均观看时长
- **人气峰值**：最高在线人数
- **互动氛围**：互动率
- **圈粉转化**：关注率

### 2. 智能字段映射

支持 CSV 字段别名自动识别：
- 中文字段名映射（如 `主播` → `hostName`）
- 字段别名识别（如 `观看人数`、`累计观看` → `totalViewers`）
- 自动类型转换

### 3. 词云生成算法

课程评价关键词提取：
- Jieba 中文分词
- 停用词过滤
- 词频统计
- 智能布局算法

## 项目亮点

| 亮点 | 说明 |
|------|------|
| 🎯 智能字段映射 | CSV 字段别名自动识别，无需严格字段名 |
| 🤖 AI 互补推荐 | 基于主播能力雷达图，智能推荐互补搭档 |
| 📊 多主播对比 | 最多 3 人雷达图同屏对比，直观展示差异 |
| ☁️ 词云可视化 | 课程评价关键词智能提取与美观展示 |
| 📈 五维评分系统 | Min-Max 归一化算法，量化主播能力 |
| 🔒 完善的错误处理 | 统一错误响应格式，详细错误信息 |
| 📝 日志记录系统 | 结构化日志，便于问题排查 |
| ✅ 数据验证 | 严格输入验证，文件格式检查 |
| 📖 API 文档自动生成 | FastAPI 自动生成交互式文档 |
| 🌍 环境变量配置 | 开发/生产环境分离，便于部署 |

## 快速开始

### 环境要求

- Node.js >= 18
- Python >= 3.10
- PostgreSQL >= 14

### 后端启动

```bash
cd backend

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 配置数据库连接和 DeepSeek API Key

# 初始化数据库
alembic upgrade head

# 启动服务
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 前端启动

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 生产构建
pnpm build
```

### 访问地址

- 前端：http://localhost:5000
- 后端 API：http://localhost:8000
- API 文档：http://localhost:8000/docs

## 环境变量

### 后端 (.env)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/datavizpro
DEEPSEEK_API_KEY=your-api-key
SECRET_KEY=your-secret-key
```

### 前端

```env
# .env.development
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_ENABLE_CONSOLE_LOG=true

# .env.production
VITE_API_BASE_URL=http://your-server:8000
VITE_ENABLE_CONSOLE_LOG=false
```

## 部署说明

### Docker 部署（推荐）

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d
```

### 手动部署

1. **后端部署**
   - 安装 Python 依赖
   - 配置 PostgreSQL 数据库
   - 使用 Gunicorn + Uvicorn 启动

2. **前端部署**
   - 构建生产版本：`pnpm build`
   - 将 `dist` 目录部署到 Nginx

3. **Nginx 配置**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 技术文档

- [API 接口文档](http://localhost:8000/docs) - FastAPI 自动生成
- [数据库设计](./docs/database.md) - 表结构与关系
- [部署指南](./docs/deployment.md) - 详细部署步骤

## 开发团队

| 角色 | 姓名 |
|------|------|
| 前端开发 | 徐成成 |
| 后端开发 | 后端团队 |

## 许可证

MIT License

---

**DataVizPro** - 让数据驱动决策，让分析更智能
