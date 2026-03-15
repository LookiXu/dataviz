import { useState, useEffect } from 'react'
import { BarChart3, BookOpen, Loader2 } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { LiveTrendChart } from '@/components/dashboard/live-trend-chart'
import { LiveStreamerChart } from '@/components/dashboard/live-streamer-chart'
import { CourseRatingChart } from '@/components/dashboard/course-rating-chart'
import { CourseEvaluationChart } from '@/components/dashboard/course-evaluation-chart'
import { Card, CardContent } from '@/components/ui/card'

// ========== 类型定义 ==========
interface HostMetric {
  name: string
  scores: number[]
  avgViewers: number
  totalViewers: number
  liveCount: number
  avgPeak: number
  maxPeak: number
  retention: number  // 人均观看时长（分钟）
  interaction: number
  fansRate: number
}

interface Host {
  id?: string       // 可选，后端可能不返回
  name: string
  strengths?: string[]  // 可选，后端可能不返回
  weaknesses?: string[] // 可选，后端可能不返回
  summary: string
  liveCount: number
  avgViewers: number
  totalViewers: number
  avgRetention: number
}

interface LiveDashboardData {
  success: boolean
  hosts: Host[]
  hostMetrics: Record<string, HostMetric>
  trend?: {
    dates: string[]
    values: number[]
  }
}

// 合并同名主播数据（大小写不敏感）并过滤组合主播
function mergeHostsByName(hosts: Host[], hostMetrics: Record<string, HostMetric>): {
  mergedHosts: Host[]
  mergedMetrics: Record<string, HostMetric>
} {
  const nameMap = new Map<string, { host: Host; metrics: HostMetric }>()
  
  // 过滤组合主播（包含 & 或 、 的名字）
  const singleHosts = hosts.filter(host => 
    !host.name.includes('&') && 
    !host.name.includes('、') &&
    !host.name.includes('和')
  )
  
  singleHosts.forEach(host => {
    const normalizedName = host.name.toLowerCase().trim()
    
    if (nameMap.has(normalizedName)) {
      // 合并数据：累加场次、取平均值
      const existing = nameMap.get(normalizedName)!
      const existingHost = existing.host
      const existingMetric = existing.metrics
      
      // 合并 host 数据
      existingHost.liveCount += host.liveCount
      existingHost.totalViewers += host.totalViewers
      existingHost.avgViewers = Math.round((existingHost.avgViewers + host.avgViewers) / 2)
      existingHost.avgRetention = Math.round((existingHost.avgRetention + host.avgRetention) / 2)
      
      // 合并 metrics 数据
      if (hostMetrics[host.name]) {
        const metric = hostMetrics[host.name]
        existingMetric.liveCount += metric.liveCount
        existingMetric.totalViewers += metric.totalViewers
        existingMetric.avgViewers = Math.round((existingMetric.avgViewers + metric.avgViewers) / 2)
        existingMetric.retention = Math.round((existingMetric.retention + metric.retention) / 2)
      }
    } else {
      nameMap.set(normalizedName, {
        host: { ...host },
        metrics: hostMetrics[host.name] ? { ...hostMetrics[host.name] } : {
          name: host.name,
          scores: [0, 0, 0, 0, 0],
          avgViewers: host.avgViewers,
          totalViewers: host.totalViewers,
          liveCount: host.liveCount,
          avgPeak: 0,
          maxPeak: 0,
          retention: host.avgRetention,
          interaction: 0,
          fansRate: 0
        }
      })
    }
  })
  
  const mergedHosts: Host[] = []
  const mergedMetrics: Record<string, HostMetric> = {}
  
  nameMap.forEach((value) => {
    // 使用第一个出现的名称（保留原始大小写）
    mergedHosts.push(value.host)
    mergedMetrics[value.host.name] = value.metrics
  })
  
  return { mergedHosts, mergedMetrics }
}

export function DashboardPage() {
  const [liveData, setLiveData] = useState<LiveDashboardData | null>(null)
  const [courseData, setCourseData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true)
      setError(null)
      
      // ========== 获取直播数据 ==========
      try {
        console.log('[Dashboard] 开始请求直播数据...')
        const liveRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/analysis/live_dashboard`)
        
        if (!liveRes.ok) {
          throw new Error(`直播接口异常: ${liveRes.status}`)
        }
        
        const rawLiveData: LiveDashboardData = await liveRes.json()
        console.log('[Dashboard] 直播接口返回:', rawLiveData)
        
        if (rawLiveData.success) {
          setLiveData(rawLiveData)
        } else {
          throw new Error('直播数据加载失败: success=false')
        }
      } catch (err) {
        console.error('[Dashboard] 直播数据获取失败:', err)
        setError(err instanceof Error ? err.message : '未知错误')
      }
      
      // ========== 获取课程数据（独立处理，不影响直播数据展示） ==========
      try {
        console.log('[Dashboard] 开始请求课程数据...')
        const courseRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/dashboard/course`)
        
        if (courseRes.ok) {
          const rawCourseData = await courseRes.json()
          console.log('[Dashboard] 课程接口返回:', rawCourseData)
          
          const courses = rawCourseData.courses || []
          setCourseData({
            courses: courses,
            indicators: rawCourseData.radarIndicators || ["教学质量", "内容实用", "节奏把控", "讲师表达", "活动设计"]
          })
        } else {
          console.warn('[Dashboard] 课程接口异常:', courseRes.status)
        }
      } catch (err) {
        console.warn('[Dashboard] 课程数据获取失败（不影响直播数据）:', err)
      }
      
      setIsLoading(false)
    }

    fetchDashboardData()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar activeTab="dashboard" />
        <main className="flex-1 container mx-auto px-6 py-8 flex items-center justify-center">
          <Card className="border-0 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12 px-16">
              <Loader2 className="w-8 h-8 text-violet-600 animate-spin mb-4" />
              <p className="text-gray-600 font-medium">加载看板数据中...</p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar activeTab="dashboard" />
        <main className="flex-1 container mx-auto px-6 py-8 flex items-center justify-center">
          <Card className="border-0 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12 px-16">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-red-500" />
              </div>
              <p className="text-gray-700 font-medium mb-2">数据加载失败</p>
              <p className="text-gray-500 text-sm">{error}</p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  // 合并同名主播数据（解决 vivi老师/Vivi老师 问题）
  const { mergedHosts, mergedMetrics } = mergeHostsByName(
    liveData?.hosts || [],
    liveData?.hostMetrics || {}
  )

  // 默认趋势数据 - 使用 MM-DD 格式，与后端统一
  const defaultTrendData = {
    dates: ['02-10', '02-11', '02-12', '02-13', '02-14', '02-15', '02-16'],
    values: [1.2, 1.5, 1.3, 1.8, 2.1, 1.9, 2.3]
  }

  // 默认主播时长数据
  const defaultRetentionData = [
    { name: 'Alice老师', hours: 45 },
    { name: 'Bob老师', hours: 38 },
    { name: 'Carol老师', hours: 32 },
    { name: 'David老师', hours: 28 },
    { name: 'Eve老师', hours: 22 }
  ]

  // ========== 调试日志 ==========
  console.log('[Dashboard] 后端返回的原始数据:', {
    hasLiveData: !!liveData,
    hostsCount: liveData?.hosts?.length || 0,
    trendData: liveData?.trend,
    sampleHost: liveData?.hosts?.[0]
  })

  // 构建趋势图数据 - 优先使用后端数据，否则使用默认数据
  // 后端返回k单位数值（如 3.2），前端直接使用
  const trendData = {
    dates: liveData?.trend?.dates?.length ? liveData.trend.dates : defaultTrendData.dates,
    values: liveData?.trend?.values?.length 
      ? liveData.trend.values.map(v => Number(v.toFixed(1))) // 确保保留1位小数
      : defaultTrendData.values
  }

  console.log('[Dashboard] 处理后的趋势数据:', trendData)

  // 构建主播场均观看时长排行数据（使用合并后的数据，或默认数据）
  const retentionRankData = mergedHosts.length > 0
    ? mergedHosts
        .map(host => ({
          name: host.name,
          hours: host.avgRetention || mergedMetrics[host.name]?.retention || 0
        }))
        .sort((a, b) => a.hours - b.hours)
    : defaultRetentionData

  // 获取参与人数最多的一门课，作为学员总规模的基数
  const totalStudents = courseData?.courses?.length > 0 
    ? Math.max(...courseData.courses.map((c: any) => c.studentCount)) 
    : 0

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar activeTab="dashboard" />
      <main className="flex-1 container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">数据可视化看板</h1>
          <p className="text-sm text-gray-500 mt-1">直播运营与课程运营数据概览</p>
        </div>

        {/* --- 直播运营板块 --- */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">直播运营数据</h2>
              <p className="text-xs text-gray-500">共 {mergedHosts.length} 位主播</p>
            </div>
          </div>
          
          {mergedHosts.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <BarChart3 className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-500">暂无直播数据</p>
                <p className="text-xs text-gray-400 mt-1">请先上传直播数据</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-5">
              {/* 7日观看人数趋势图 */}
              <LiveTrendChart
                data={{ dates: trendData.dates, values: trendData.values }}
                title="7日总观看人数趋势"
              />
              {/* 主播场均观看时长排行 */}
              <LiveStreamerChart
                data={retentionRankData}
                title="主播场均观看时长排行"
              />
            </div>
          )}
        </div>

        {/* --- 课程运营板块 --- */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">课程运营数据</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <CourseRatingChart courses={courseData?.courses || []} totalStudents={totalStudents} />
            <CourseEvaluationChart courses={courseData?.courses || []} indicators={courseData?.indicators || []} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
