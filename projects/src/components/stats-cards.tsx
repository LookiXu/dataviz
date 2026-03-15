import { useState, useEffect } from 'react'
import { Video, BookOpen, Database, TrendingUp, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface StatsData {
  totalLiveStreams: number
  totalCourseReviews: number
  dataProcessingSuccessRate: number
  dateRange: string
  courseNames: string
}

interface StatCardProps {
  icon: React.ReactNode
  iconBg: string
  value: string
  label: string
  trend?: {
    value: string
    positive: boolean
  }
  status?: string
}

interface StatsCardsProps {
  onNavigate?: (page: string) => void
}

function StatCard({ icon, iconBg, value, label, trend, status }: StatCardProps) {
  return (
    <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
            {icon}
          </div>
          {trend && (
            <Badge 
              variant={trend.positive ? 'default' : 'secondary'}
              className={trend.positive ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              {trend.value}
            </Badge>
          )}
          {status && (
            <span className="text-xs text-gray-500">{status}</span>
          )}
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-sm text-gray-500 mt-1">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}

export function StatsCards({ onNavigate }: StatsCardsProps) {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    console.log('[StatsCards] 开始获取统计数据...')
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/overview/stats`)
      .then(res => res.json())
      .then(data => {
        console.log('[StatsCards] 统计数据返回:', data)
        if (data.success) {
          setStats(data.data)
        }
      })
      .catch(err => {
        console.error('[StatsCards] 获取统计数据失败:', err)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const handleUploadClick = () => {
    if (onNavigate) {
      onNavigate('upload')
    } else {
      window.location.hash = 'upload'
    }
  }

  const handleDashboardClick = () => {
    if (onNavigate) {
      onNavigate('dashboard')
    } else {
      window.location.hash = 'dashboard'
    }
  }

  // 加载状态
  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="border-0 shadow-sm bg-white">
            <CardContent className="p-6 flex items-center justify-center h-[120px]">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-4 gap-6">
      <StatCard
        icon={<Video className="w-5 h-5 text-purple-600" />}
        iconBg="bg-purple-50"
        value={stats?.totalLiveStreams?.toString() || '0'}
        label="累计直播场次"
        trend={{ value: stats?.dateRange || '', positive: true }}
      />
      <StatCard
        icon={<BookOpen className="w-5 h-5 text-teal-600" />}
        iconBg="bg-teal-50"
        value={stats?.totalCourseReviews?.toString() || '0'}
        label="课程评价总数"
        trend={{ value: stats?.courseNames || '', positive: true }}
      />
      <StatCard
        icon={<Database className="w-5 h-5 text-orange-600" />}
        iconBg="bg-orange-50"
        value={`${stats?.dataProcessingSuccessRate || 100}%`}
        label="数据预处理成功率"
        status="已同步最新数据"
      />
      <Card className="border-0 shadow-sm bg-slate-800 text-white">
        <CardContent className="p-6 flex flex-col justify-between h-full">
          <h3 className="font-semibold text-lg">快速开始分析</h3>
          <div className="space-y-2 mt-4">
            <Button 
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              onClick={handleUploadClick}
            >
              <Database className="w-4 h-4 mr-2" />
              上传新数据
            </Button>
            <Button 
              variant="secondary" 
              className="w-full bg-slate-700 hover:bg-slate-600 text-white"
              onClick={handleDashboardClick}
            >
              查看数据看板
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
