import { useState, useEffect } from 'react'
import { Navbar } from '@/components/navbar'
import { StatsCards } from '@/components/stats-cards'
import { TrendChart } from '@/components/trend-chart'
import { TodoList } from '@/components/todo-list'
import { Footer } from '@/components/footer'
import { DataUploadPage } from '@/pages/data-upload'
import AnalysisPage from '@/pages/analysis'
import { DashboardPage } from '@/pages/dashboard'
import { Button } from '@/components/ui/button'
import { Clock } from 'lucide-react'

type PageType = 'overview' | 'upload' | 'analysis' | 'dashboard'

interface OverviewPageProps {
  onNavigate: (page: string) => void
}

function OverviewPage({ onNavigate }: OverviewPageProps) {
  // 实时北京时间显示
  const [currentTime, setCurrentTime] = useState('')
  // 动态统计数据
  const [stats, setStats] = useState<{ totalLiveStreams: number; totalCourseReviews: number } | null>(null)

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      // 使用北京时间 (UTC+8)
      const beijingTime = new Date(now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }))
      const year = beijingTime.getFullYear()
      const month = String(beijingTime.getMonth() + 1).padStart(2, '0')
      const day = String(beijingTime.getDate()).padStart(2, '0')
      const hours = String(beijingTime.getHours()).padStart(2, '0')
      const minutes = String(beijingTime.getMinutes()).padStart(2, '0')
      const seconds = String(beijingTime.getSeconds()).padStart(2, '0')
      setCurrentTime(`${year}-${month}-${day} ${hours}:${minutes}:${seconds}`)
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // 获取统计数据
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/overview/stats`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats({
            totalLiveStreams: data.data.totalLiveStreams || 0,
            totalCourseReviews: data.data.totalCourseReviews || 0,
          })
        }
      })
      .catch(err => console.error('获取统计数据失败:', err))
  }, [])

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据总览控制台</h1>
          <p className="text-gray-500 mt-1">
            欢迎回来，已累计录入{' '}
            <span className="text-purple-600 font-semibold">{stats?.totalLiveStreams || 0}</span>
            {' '}场直播、{' '}
            <span className="text-teal-600 font-semibold">{stats?.totalCourseReviews || 0}</span>
            {' '}条课程评价。
          </p>
        </div>
        
        {/* 实时北京时间显示 */}
        <Button variant="outline" className="gap-2 bg-white font-mono">
          <Clock className="w-4 h-4 text-purple-500" />
          <span className="text-gray-700">{currentTime}</span>
        </Button>
        
        {/* 日期筛选功能（后续开发时取消注释）
        <Button variant="outline" className="gap-2 bg-white">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-gray-700">{dateRange}</span>
        </Button>
        */}
      </div>

      {/* Stats Cards */}
      <StatsCards onNavigate={onNavigate} />

      {/* Bottom Section - 优化比例 5:2 */}
      <div className="grid grid-cols-7 gap-6 mt-6">
        <div className="col-span-5">
          <TrendChart />
        </div>
        <div className="col-span-2">
          <TodoList />
        </div>
      </div>
    </>
  )
}

function App() {
  // 从 URL hash 获取当前页面
  const getPageFromHash = (): PageType => {
    const hash = window.location.hash.replace('#', '')
    if (['overview', 'upload', 'analysis', 'dashboard'].includes(hash)) {
      return hash as PageType
    }
    return 'overview'
  }

  const [currentPage, setCurrentPage] = useState<PageType>(getPageFromHash())

  // 监听 hash 变化
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPage(getPageFromHash())
    }
    
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const handleNavigate = (page: string) => {
    window.location.hash = page
    setCurrentPage(page as PageType)
  }

  // 根据当前页面渲染对应内容
  const renderPage = () => {
    switch (currentPage) {
      case 'upload':
        return <DataUploadPage />
      case 'analysis':
        return <AnalysisPage />
      case 'dashboard':
        return <DashboardPage />
      default:
        return <OverviewPage onNavigate={handleNavigate} />
    }
  }

  // 特殊页面使用独立布局
  if (currentPage === 'upload') {
    return <DataUploadPage />
  }
  
  if (currentPage === 'analysis') {
    return <AnalysisPage />
  }

  if (currentPage === 'dashboard') {
    return <DashboardPage />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar 
        activeTab={currentPage} 
        onNavigate={handleNavigate}
      />
      
      <main className="flex-1 container mx-auto px-6 py-8">
        {renderPage()}
      </main>

      <Footer />
    </div>
  )
}

export default App
