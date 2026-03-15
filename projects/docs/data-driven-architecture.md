# 数据驱动与动态更新逻辑规划

## 一、当前状态

看板页面已实现8张图表，但数据为静态示例数据。需要将数据层与展示层分离，实现数据驱动的动态更新。

## 二、数据架构设计

### 2.1 数据流向
```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────┐
│   PostgreSQL    │────▶│  Flask API   │────▶│  Frontend   │────▶│   Charts    │
│   Database      │     │   Backend    │     │  useState   │     │  Rendering  │
└─────────────────┘     └──────────────┘     └─────────────┘     └─────────────┘
                              │                       ▲
                              ▼                       │
                       ┌──────────────┐              │
                       │  Prisma ORM  │──────────────┘
                       │  Data Models │        (自动刷新)
                       └──────────────┘
```

### 2.2 数据模型定义

#### 直播数据模型 (LiveData)
```typescript
interface LiveSession {
  id: string
  sessionName: string
  date: Date
  startTime: string
  endTime: string
  totalViews: number
  retentionRate: number
  hostId: string
  hostName: string
}

interface TrafficSource {
  id: string
  sourceType: 'search' | 'recommendation' | 'share' | 'others'
  visitCount: number
  date: Date
}

interface HostPerformance {
  hostId: string
  hostName: string
  avgWatchTime: number
  totalSessions: number
  totalViews: number
}

// 聚合后的看板数据
interface LiveDashboardData {
  trend: {
    dates: string[]
    currentPeriod: number[]
    previousPeriod: number[]
  }
  retention: {
    sessions: string[]
    rates: number[]
  }
  traffic: {
    sources: TrafficSourceAggregate[]
    totalVisits: number
  }
  streamers: HostPerformance[]
}
```

#### 课程数据模型 (CourseData)
```typescript
interface Course {
  id: string
  name: string
  category: string
  startDate: Date
  endDate: Date
  maxStudents: number
}

interface CourseRating {
  id: string
  courseId: string
  studentId: string
  overallScore: number  // 1-5分
  dimensionScores: {
    contentDepth: number
    clarity: number
    practicality: number
    pacing: number
    interaction: number
  }
  comment?: string
  createdAt: Date
}

// 聚合后的看板数据
interface CourseDashboardData {
  ratings: Array<{
    courseId: string
    courseName: string
    avgScore: number
    studentCount: number
    distribution: {
      star5: number
      star4: number
      star3: number
      star2: number
      star1: number
    }
  }>
  satisfaction: Array<{
    courseId: string
    courseName: string
    score: number
  }>
  evaluation: {
    indicators: string[]
    courses: Array<{
      courseId: string
      name: string
      scores: number[]
    }>
  }
  reviewTrend: {
    months: string[]
    positiveRate: number[]
    reviewCount: number[]
  }
}
```

## 三、后端 API 设计

### 3.1 直播数据接口
```
GET /api/dashboard/live

Response:
{
  "success": true,
  "data": {
    "trend": {
      "dates": ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
      "currentPeriod": [2.5, 3.1, 4.0, 5.2, 6.3, 7.4, 8.7],
      "previousPeriod": [2.1, 2.8, 3.5, 4.2, 5.1, 6.2, 7.1]
    },
    "retention": {
      "sessions": ["早场", "午场", "晚场A", "晚场B", "周末场", "活动场", "专场"],
      "rates": [68, 55, 74, 82, 61, 88, 72]
    },
    "traffic": {
      "sources": [
        { "name": "Search", "value": 42, "icon": "search" },
        { "name": "Recommendation", "value": 28, "icon": "star" },
        { "name": "Share", "value": 18, "icon": "share" },
        { "name": "Others", "value": 12, "icon": "more" }
      ],
      "totalVisits": "124.5K"
    },
    "streamers": [
      { "name": "主播A", "avgWatchHours": 42 },
      { "name": "主播B", "avgWatchHours": 35 },
      ...
    ]
  }
}
```

### 3.2 课程数据接口
```
GET /api/dashboard/course

Response:
{
  "success": true,
  "data": {
    "ratings": [
      {
        "courseId": "course-001",
        "courseName": "Python入门",
        "avgScore": 4.8,
        "studentCount": 25,
        "distribution": { "star5": 20, "star4": 4, "star3": 1, "star2": 0, "star1": 0 }
      },
      ...
    ],
    "satisfaction": [...],
    "evaluation": {...},
    "reviewTrend": {...}
  }
}
```

### 3.3 实时数据更新接口（可选）
```
WebSocket: /ws/dashboard
或
SSE: /api/dashboard/stream

用于实时推送数据更新，如直播正在进行时的实时观看人数
```

## 四、前端数据管理方案

### 4.1 推荐方案：React Hooks + 定时刷新
```typescript
// hooks/useDashboardData.ts
import { useState, useEffect, useCallback } from 'react'

interface UseDashboardDataOptions {
  refreshInterval?: number  // 自动刷新间隔（毫秒）
  enableRealtime?: boolean  // 是否启用实时更新
}

export function useDashboardData(options: UseDashboardDataOptions = {}) {
  const { refreshInterval = 30000, enableRealtime = false } = options
  
  const [liveData, setLiveData] = useState<LiveDashboardData | null>(null)
  const [courseData, setCourseData] = useState<CourseDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // 获取数据函数
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      const [liveRes, courseRes] = await Promise.all([
        fetch('/api/dashboard/live').then(r => r.json()),
        fetch('/api/dashboard/course').then(r => r.json())
      ])
      
      if (liveRes.success) setLiveData(liveRes.data)
      if (courseRes.success) setCourseData(courseRes.data)
      
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [])

  // 初始加载 + 定时刷新
  useEffect(() => {
    fetchData()
    
    if (refreshInterval > 0) {
      const intervalId = setInterval(fetchData, refreshInterval)
      return () => clearInterval(intervalId)
    }
  }, [fetchData, refreshInterval])

  // 手动刷新
  const refresh = useCallback(() => {
    fetchData()
  }, [fetchData])

  return { liveData, courseData, loading, error, lastUpdated, refresh }
}
```

### 4.2 在看板页面中使用
```typescript
// DashboardPage.tsx
export function DashboardPage() {
  const { liveData, courseData, loading, error, lastUpdated, refresh } = useDashboardData({
    refreshInterval: 30000  // 30秒刷新一次
  })

  if (loading && !liveData) {
    return <DashboardSkeleton />  // 加载骨架屏
  }

  if (error) {
    return <ErrorState onRetry={refresh} />  // 错误状态
  }

  return (
    <div>
      {/* 显示最后更新时间 */}
      <div className="text-sm text-gray-500">
        最后更新: {lastUpdated?.toLocaleTimeString()}
        <button onClick={refresh}>刷新</button>
      </div>
      
      {/* 渲染图表 */}
      <LiveTrendChart data={liveData.trend} />
      ...
    </div>
  )
}
```

## 五、数据聚合逻辑（后端）

### 5.1 趋势数据聚合
```python
# backend/app/services/dashboard_service.py
from datetime import datetime, timedelta
from typing import List, Dict
from prisma import Prisma

class DashboardService:
    def __init__(self, db: Prisma):
        self.db = db

    async def get_live_trend(self, days: int = 7) -> Dict:
        """获取直播观看趋势"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # 查询当前周期数据
        current_data = await self.db.livesession.find_many(
            where={
                "date": {"gte": start_date, "lte": end_date}
            }
        )
        
        # 查询上一周期数据（用于对比）
        prev_start = start_date - timedelta(days=days)
        prev_end = start_date
        previous_data = await self.db.livesession.find_many(
            where={
                "date": {"gte": prev_start, "lte": prev_end}
            }
        )
        
        # 按日期聚合
        return {
            "dates": self._get_dates(start_date, days),
            "currentPeriod": self._aggregate_by_day(current_data),
            "previousPeriod": self._aggregate_by_day(previous_data)
        }
    
    async def get_course_ratings(self) -> List[Dict]:
        """获取课程评分分布"""
        courses = await self.db.course.find_many()
        
        result = []
        for course in courses:
            ratings = await self.db.courserating.find_many(
                where={"courseId": course.id}
            )
            
            distribution = {"star5": 0, "star4": 0, "star3": 0, "star2": 0, "star1": 0}
            total_score = 0
            
            for rating in ratings:
                score = rating.overallScore
                if score >= 4.5: distribution["star5"] += 1
                elif score >= 3.5: distribution["star4"] += 1
                elif score >= 2.5: distribution["star3"] += 1
                elif score >= 1.5: distribution["star2"] += 1
                else: distribution["star1"] += 1
                total_score += score
            
            result.append({
                "courseId": course.id,
                "courseName": course.name,
                "avgScore": round(total_score / len(ratings), 1) if ratings else 0,
                "studentCount": len(ratings),
                "distribution": distribution
            })
        
        return result
```

## 六、实施计划

### 阶段一：数据层搭建（P0）
1. 设计 Prisma Schema（直播会话、课程、评分等模型）
2. 创建数据库迁移
3. 实现基础数据聚合服务

### 阶段二：API 开发（P0）
1. 实现 `/api/dashboard/live` 接口
2. 实现 `/api/dashboard/course` 接口
3. 添加数据缓存（Redis）

### 阶段三：前端集成（P1）
1. 实现 `useDashboardData` Hook
2. 替换静态数据为 API 调用
3. 添加加载状态和错误处理

### 阶段四：优化增强（P2）
1. 实现 WebSocket 实时更新
2. 添加数据导出功能
3. 实现自定义时间范围筛选

## 七、文件结构

```
backend/
├── app/
│   ├── api/
│   │   └── dashboard.py       # API 路由
│   ├── services/
│   │   └── dashboard_service.py  # 数据聚合逻辑
│   └── models/
│       └── dashboard.py       # 数据模型定义
├── prisma/
│   └── schema.prisma          # 数据库模型

frontend/
├── src/
│   ├── hooks/
│   │   └── useDashboardData.ts   # 数据获取 Hook
│   ├── services/
│   │   └── dashboard.ts       # API 调用封装
│   └── pages/
│       └── dashboard.tsx      # 看板页面
```

## 八、注意事项

1. **性能优化**：大数据量时使用数据库聚合而非内存聚合
2. **缓存策略**：看板数据可缓存 1-5 分钟，减少数据库压力
3. **错误处理**：API 失败时显示上次成功数据 + 错误提示
4. ** loading 状态**：首次加载显示骨架屏，刷新时显示轻量 loading
5. **数据一致性**：确保各图表间的数据口径一致
