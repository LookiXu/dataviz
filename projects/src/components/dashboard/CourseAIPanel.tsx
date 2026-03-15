import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Loader2 } from 'lucide-react'

export function CourseAIPanel() {
  const [courses, setCourses] = useState<{ courseName: string }[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [report, setReport] = useState<string>('')
  
  // 【状态机：防并发锁】防止用户在 DeepSeek 思考的 10 秒内疯狂连击按钮
  const [isGenerating, setIsGenerating] = useState(false)

  // 初始化：自动拉取有数据的课程列表
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/dashboard/course`)
      .then(res => res.json())
      .then(data => {
        if (data.courses && data.courses.length > 0) {
          setCourses(data.courses)
          setSelectedCourse(data.courses[0].courseName)
        }
      })
      .catch(err => console.error('获取课程列表失败', err))
  }, [])

  // 核心交互逻辑
  const handleGenerateAI = async () => {
    // 边界拦截：无课程或正在生成中，直接阻断
    if (!selectedCourse || isGenerating) return
    
    setIsGenerating(true)
    setReport('') // 清理旧战场

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/ai/course_diagnosis?course_name=${encodeURIComponent(selectedCourse)}`)
      const data = await response.json()
      setReport(data.report)
    } catch (error) {
      setReport('⚠️ 网络请求失败，请检查后端服务是否正常运行。')
    } finally {
      setIsGenerating(false) // 释放状态锁
    }
  }

  return (
    <Card className="shadow-sm border-0 h-full flex flex-col bg-gradient-to-br from-indigo-50/50 to-white">
      <CardHeader className="flex flex-row items-center justify-between pb-4 shrink-0 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            AI 课程深度诊断
          </CardTitle>
          <p className="text-xs text-gray-500 uppercase">AI-POWERED COURSE INSIGHTS</p>
        </div>
        <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 border-0 rounded-full px-3 py-1">
          DeepSeek 引擎
        </Badge>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 pt-0">
        {/* 控制面板：下拉框 + 生成按钮 */}
        <div className="flex gap-3">
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            disabled={isGenerating || courses.length === 0}
            className="flex-1 h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {courses.length === 0 ? (
              <option value="">暂无课程数据</option>
            ) : (
              courses.map(c => (
                <option key={c.courseName} value={c.courseName}>
                  {c.courseName}
                </option>
              ))
            )}
          </select>
          <Button 
            onClick={handleGenerateAI} 
            disabled={isGenerating || !selectedCourse}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                正在深度思考...
              </>
            ) : (
              '一键生成诊断'
            )}
          </Button>
        </div>

        {/* 报告渲染区域：支持基础 Markdown 换行呈现 */}
        <div className="flex-1 bg-white rounded-xl border border-indigo-100/50 p-5 overflow-y-auto min-h-[250px] max-h-[400px]">
          {!report && !isGenerating ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
              <Sparkles className="w-8 h-8 opacity-20" />
              <p className="text-sm">选择一门课程，获取 DeepSeek 数据洞察</p>
            </div>
          ) : (
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {report}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
