import { useState } from 'react'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// 预设莫兰迪高级色系，支持最多 5 门课程对比
const COLORS = ['#0d9488', '#6366f1', '#f59e0b', '#ec4899', '#3b82f6']

interface CourseEvaluationChartProps {
  courses: any[]
  indicators: string[]
}

export function CourseEvaluationChart({ courses = [], indicators = [] }: CourseEvaluationChartProps) {
  // 状态管理：记录用户点击隐藏的课程名称
  const [hiddenCourses, setHiddenCourses] = useState<string[]>([])

  // 【数据转换层】将后端按"行"组织的课程数据，转置为 Recharts 所需的按"雷达角（指标）"组织的数据
  const chartData = indicators.map((indicator, idx) => {
    // 注入 '_anchor: 0'：这是一个结构性 Hack。
    // 目的：提供一个永远存在的数据点，防止在所有真实课程被隐藏时，雷达图因失去数据而坍塌骨架。
    const dataPoint: any = { indicator, _anchor: 0 }
    courses.forEach(c => {
      dataPoint[c.courseName] = c.radarScores?.[idx] || 0
    })
    return dataPoint
  })

  // 【交互控制器】处理图例的点击事件，实现显示/隐藏的切换
  const toggleCourse = (courseName: string) => {
    setHiddenCourses(prev => 
      prev.includes(courseName) 
        ? prev.filter(name => name !== courseName) // 已隐藏则移除（恢复显示）
        : [...prev, courseName]                    // 未隐藏则加入（隐藏）
    )
  }

  return (
    <Card className="col-span-1 shadow-sm border-0 h-full flex flex-col">
      {/* 【视图层：头部结构】使用 space-y-0 清除默认间距，确保左右绝对垂直居中 */}
      <CardHeader className="flex flex-row items-center justify-between pb-4 shrink-0 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base font-bold text-gray-900">课程多维评价对比</CardTitle>
          <p className="text-xs text-gray-500 uppercase">5-DIMENSION EVALUATION ANALYSIS</p>
        </div>
        {/* 【视图层：标签 UI】彻底放弃第三方 Variant，使用原生 Tailwind 精确还原胶囊样式 */}
        <div className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#ccfbf1] text-[#0f766e]">
          课程数据
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col pt-0">
        <div className="flex-1 w-full min-h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
              {/* 绘制底层的多边形网格 */}
              <PolarGrid stroke="#e5e7eb" />
              {/* 绘制 5 个维度的文字标签 */}
              <PolarAngleAxis 
                dataKey="indicator" 
                tick={{ fill: '#4b5563', fontSize: 13, fontWeight: 500 }} 
              />
              {/* 【核心防御：锁定极轴】强制 Y 轴范围为 0-100，避免因为个别低分导致整个雷达图形状畸变 */}
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 100]} 
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                tickCount={6}
              />
              
              {/* 【视图层：悬浮提示框】 */}
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ fontWeight: 500 }}
                formatter={(value, name) => {
                  // 【拦截器】过滤掉"已隐藏的课程"和"隐形锚点"，确保悬浮框中只有干净、真实的用户数据
                  if (hiddenCourses.includes(name as string) || name === '_anchor') return null
                  return [value, name]
                }}
              />
              
              {/* 【隐形守护者】
                  渲染一个纯透明、无交互、无动画的雷达多边形。
                  它是应对 Recharts "0 组件则销毁网格" 机制的终极解法。
              */}
              <Radar 
                dataKey="_anchor" 
                fill="transparent" 
                stroke="transparent" 
                dot={false} 
                activeDot={false} 
                isAnimationActive={false} 
              />

              {/* 【动态渲染引擎】根据用户交互，动态渲染真实的课程数据 */}
              {courses.map((course, index) => {
                // 如果该课程在隐藏名单中，直接 return null 卸载。
                // 这样做的目的是：让留下的图形重新触发布局计算，完美保留 Recharts 原生的"动态生长动画"
                if (hiddenCourses.includes(course.courseName)) return null
                
                const color = COLORS[index % COLORS.length]
                
                return (
                  <Radar
                    key={course.courseName}
                    name={course.courseName}
                    dataKey={course.courseName}
                    stroke={color}
                    strokeWidth={2}
                    fill={color}
                    fillOpacity={0.3}
                    dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: color }}
                    activeDot={{ r: 6, fill: color, stroke: '#fff', strokeWidth: 2 }}
                  />
                )
              })}
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* 【视图层：动态图例控制器】 */}
        <div className="shrink-0 flex flex-wrap items-center justify-center gap-4 pt-4 mt-2 border-t border-gray-100">
          {courses.map((course, index) => {
            const color = COLORS[index % COLORS.length]
            const isHidden = hiddenCourses.includes(course.courseName)
            
            return (
              <button
                key={course.courseName}
                onClick={() => toggleCourse(course.courseName)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-sm ${
                  // 如果被隐藏，降低透明度并置灰；否则保持高亮
                  isHidden ? 'opacity-40 grayscale hover:opacity-70' : 'opacity-100 hover:bg-gray-50'
                }`}
              >
                <span 
                  className="w-8 h-3 rounded-sm" 
                  style={{ backgroundColor: color }}
                />
                <span className={`font-medium ${isHidden ? 'text-gray-400' : 'text-gray-700'}`}>
                  {course.courseName}
                </span>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
