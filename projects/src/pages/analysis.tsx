import { useState, useEffect } from 'react'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RadarChart } from '@/components/radar-chart'
import { HostProfileCards } from '@/components/host-profile-cards'
import { ComplementaryRecommendation } from '@/components/complementary-recommendation'
import { WordCloudChart } from '@/components/word-cloud-chart'
import { CourseAIPanel } from '@/components/dashboard/CourseAIPanel'
import { Loader2, BarChart3, BookOpen, Check } from 'lucide-react'

// ========== 类型定义 ==========
interface HostData {
  name: string
  scores: number[]
}

interface Host {
  id: string
  name: string
  strengths: string[]
  weaknesses: string[]
  recordCount?: number
}

// 用于 AI 推荐的完整主播数据
interface HostFullData {
  id: string
  name: string
  scores: number[]
  strengths: string[]
  weaknesses: string[]
}

interface DashboardData {
  hosts: Host[]
  hostMetrics: Record<string, HostData>
  wordCloudData: Record<string, { name: string; value: number }[]>
  courses: string[]
}

// ========== 配色方案 ==========
const COLORS = [
  { main: '#8B5CF6', bg: 'bg-violet-600', border: 'border-violet-600', ring: 'ring-violet-500' },
  { main: '#F59E0B', bg: 'bg-amber-500', border: 'border-amber-500', ring: 'ring-amber-500' },
  { main: '#0D9488', bg: 'bg-teal-600', border: 'border-teal-600', ring: 'ring-teal-500' },
]

export default function AnalysisPage() {
  // ========== 状态管理 ==========
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 默认选中前两个主播
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  // 课程选择器状态
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  
  // 已选数量限制（最多3个）
  const MAX_SELECTED = 3

  // ========== 数据加载 ==========
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/analysis/dashboard`)
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setData(json)
          // 默认选中前两个主播
          if (json.hosts && json.hosts.length > 0) {
            const defaultSelected = json.hosts.slice(0, 2).map((h: Host) => h.id)
            setSelectedIds(defaultSelected)
          }
          // 默认选中第一个课程
          if (json.wordCloudData && Object.keys(json.wordCloudData).length > 0) {
            const firstCourse = Object.keys(json.wordCloudData)[0]
            setSelectedCourse(firstCourse)
          }
        } else {
          setError(json.error || '加载数据失败')
        }
      })
      .catch(() => {
        setError('网络请求失败，请检查后端服务')
      })
      .finally(() => setLoading(false))
  }, [])

  // ========== 主播选择逻辑 ==========
  const toggleHost = (hostId: string) => {
    if (selectedIds.includes(hostId)) {
      // 取消选择
      setSelectedIds(selectedIds.filter(id => id !== hostId))
    } else {
      // 新增选择（检查上限）
      if (selectedIds.length < MAX_SELECTED) {
        setSelectedIds([...selectedIds, hostId])
      }
    }
  }

  // 获取选中主播的名称列表
  const getSelectedHostNames = (): string[] => {
    if (!data?.hosts) return []
    return data.hosts
      .filter(h => selectedIds.includes(h.id))
      .map(h => h.name)
  }

  // ========== 渲染雷达图数据 ==========
  const getRadarData = (): Record<string, HostData> => {
    if (!data?.hostMetrics || !data?.hosts) return {}
    
    const result: Record<string, HostData> = {}
    selectedIds.forEach(id => {
      // 找到对应的主播
      const host = data.hosts.find(h => h.id === id)
      if (host) {
        // 后端 hostMetrics 使用 host.name 作为 key，兼容 id 和 name
        const metric = data.hostMetrics[host.name] || data.hostMetrics[id]
        if (metric) {
          // 使用主播名称作为 key，确保雷达图正确显示
          result[host.name] = metric
        }
      }
    })
    return result
  }

  // ========== 获取当前课程的词云数据 ==========
  const getWordCloudData = (): { name: string; value: number }[] => {
    if (!data?.wordCloudData || !selectedCourse) return []
    return data.wordCloudData[selectedCourse] || []
  }

  // ========== 获取所有课程列表 ==========
  const getCourseList = (): string[] => {
    if (!data?.wordCloudData) return []
    return Object.keys(data.wordCloudData)
  }

  // ========== 获取完整主播数据（用于 AI 推荐）==========
  const getHostsFullData = (): HostFullData[] => {
    if (!data?.hosts || !data?.hostMetrics) return []
    
    console.log('[Analysis] getHostsFullData - hosts:', data.hosts)
    console.log('[Analysis] getHostsFullData - hostMetrics keys:', Object.keys(data.hostMetrics))
    
    return data.hosts.map(host => {
      // 后端 hostMetrics 使用 host.id 作为 key
      const metric = data.hostMetrics[host.id] || data.hostMetrics[host.name]
      console.log(`[Analysis] Host ${host.name} (id: ${host.id}):`, metric)
      
      return {
        id: host.id,
        name: host.name,
        scores: metric?.scores || [0, 0, 0, 0, 0],
        strengths: host.strengths || [],
        weaknesses: host.weaknesses || []
      }
    })
  }

  // ========== 加载状态 ==========
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
        <Navbar activeTab="analysis" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-violet-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-500">正在加载数据分析...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // ========== 错误状态 ==========
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
        <Navbar activeTab="analysis" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-gray-700 font-medium mb-2">加载失败</p>
            <p className="text-gray-500 text-sm">{error}</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // ========== 空数据状态 ==========
  if (!data?.hosts || data.hosts.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
        <Navbar activeTab="analysis" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-violet-500" />
            </div>
            <p className="text-gray-700 font-medium mb-2">暂无数据</p>
            <p className="text-gray-500 text-sm">请先上传直播数据后再进行分析</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // ========== 正常渲染 ==========
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      <Navbar activeTab="analysis" />
      
      <main className="flex-1 container mx-auto px-6 py-8">
        {/* ========== 页面标题区 ========== */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">直播运营分析</h1>
              <p className="text-sm text-gray-500">主播多维能力对比与互补推荐</p>
            </div>
          </div>
        </div>

        {/* ========== 主播选择区 ========== */}
        <Card className="border-0 shadow-sm mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-violet-600" />
                </div>
                <CardTitle className="text-base font-semibold text-gray-900">
                  选择对比主播
                </CardTitle>
              </div>
              <Badge variant="secondary" className="bg-violet-100 text-violet-700 border-0 rounded-full px-3">
                已选 {selectedIds.length} 位，最多 {MAX_SELECTED} 位
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-3">
              {data.hosts.map((host, index) => {
                const isSelected = selectedIds.includes(host.id)
                const color = COLORS[index % COLORS.length]
                
                return (
                  <button
                    key={host.id}
                    onClick={() => toggleHost(host.id)}
                    className={`
                      relative px-5 py-2.5 rounded-xl text-sm font-medium
                      transition-all duration-200 ease-out
                      ${isSelected 
                        ? `${color.bg} text-white shadow-lg` 
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-sm'
                      }
                    `}
                    style={isSelected ? { boxShadow: `0 10px 25px -5px ${color.main}40` } : {}}
                  >
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <Check className="w-3 h-3" style={{ color: color.main }} />
                      </div>
                    )}
                    {host.name}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* ========== 核心分析区：雷达图 + 主播卡片 ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* 左侧：雷达图 (2/3 宽度) */}
          <div className="lg:col-span-2">
            {selectedIds.length > 0 ? (
              <RadarChart data={getRadarData()} />
            ) : (
              <Card className="border-0 shadow-sm h-full">
                <CardContent className="flex items-center justify-center h-[400px] text-gray-400">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">请选择主播查看雷达图分析</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* 右侧：主播能力卡片 (1/3 宽度) */}
          <div className="lg:col-span-1">
            <HostProfileCards 
              hosts={data.hosts} 
              selectedIds={selectedIds} 
            />
          </div>
        </div>

        {/* ========== AI 互补推荐区 ========== */}
        <div className="mb-8">
          <ComplementaryRecommendation 
            selectedHostIds={selectedIds}
            hostNames={getSelectedHostNames()}
            hosts={getHostsFullData()}
          />
        </div>

        {/* ========== 课程运营分析板块 ========== */}
        <div className="mt-8 pt-8 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">课程运营分析</h2>
              <p className="text-sm text-gray-500">学员评价洞察与 AI 深度诊断</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左侧：词云图 */}
            <div>
              {/* 课程选择器 */}
              {getCourseList().length > 0 && (
                <div className="mb-4">
                  <label className="text-sm text-gray-600 mr-3">选择课程：</label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="h-9 rounded-md border border-gray-200 bg-white px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {getCourseList().map(course => (
                      <option key={course} value={course}>
                        {course}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {getWordCloudData().length > 0 ? (
                <WordCloudChart 
                  data={getWordCloudData()} 
                  title={`${selectedCourse} - 评价关键词云`} 
                />
              ) : (
                <Card className="border-0 shadow-sm h-full">
                  <CardContent className="flex items-center justify-center h-[400px] text-gray-400">
                    <div className="text-center">
                      <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">暂无课程评价数据</p>
                      <p className="text-xs text-gray-300 mt-2">请先上传课程反馈数据</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            {/* 右侧：AI 课程诊断 */}
            <div>
              <CourseAIPanel />
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
