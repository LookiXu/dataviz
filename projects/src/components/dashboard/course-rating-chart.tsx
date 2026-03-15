import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CourseRating {
  courseName: string
  avgScore: number
  studentCount: number
}

interface CourseRatingChartProps {
  courses: CourseRating[]
  totalStudents: number
  title?: string
  subtitle?: string
}

export function CourseRatingChart({ 
  courses, 
  totalStudents,
  title = '课程满意度评分',
  subtitle = 'COURSE RATING OVERVIEW'
}: CourseRatingChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    chartInstance.current = echarts.init(chartRef.current)

    // 按满意度排序（高到低）
    const sortedData = [...courses].sort((a, b) => b.avgScore - a.avgScore)

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        textStyle: { color: '#374151' },
        formatter: (params: any) => {
          const dataIndex = params[0]?.dataIndex || 0
          const course = sortedData[dataIndex]
          return `
            <div class="font-medium">${course.courseName}</div>
            <div class="text-teal-600">满意度: ${course.avgScore}分</div>
            <div class="text-gray-500">评分人数: ${course.studentCount}人</div>
          `
        }
      },
      grid: {
        left: '10%',
        right: '8%',
        bottom: '18%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: sortedData.map(d => d.courseName),
        axisLine: { lineStyle: { color: '#E5E7EB' } },
        axisLabel: { 
          color: '#6B7280', 
          fontSize: 12,
          margin: 16,
          interval: 0,
          rotate: 20
        },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        name: '满意度（分）',
        min: 0,
        max: 5,
        interval: 1,
        nameTextStyle: { 
          color: '#6B7280', 
          fontSize: 12,
          padding: [0, 0, 0, -30]
        },
        axisLine: { 
          show: true,
          lineStyle: { color: '#E5E7EB' }
        },
        axisTick: { show: false },
        axisLabel: { 
          color: '#6B7280', 
          fontSize: 12,
          margin: 12
        },
        splitLine: { 
          lineStyle: { 
            color: '#F3F4F6',
            type: 'dashed'
          } 
        }
      },
      series: [{
        type: 'bar',
        barWidth: '40%',
        data: sortedData.map((course) => ({
          value: course.avgScore,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: course.avgScore >= 5 ? '#2DD4BF' : course.avgScore >= 4 ? '#14B8A6' : '#0D9488' },
              { offset: 1, color: course.avgScore >= 5 ? '#0D9488' : '#0F766E' }
            ]),
            borderRadius: [6, 6, 0, 0]
          }
        })),
        label: {
          show: true,
          position: 'top',
          formatter: (params: any) => {
            const course = sortedData[params.dataIndex]
            return `{score|${params.value}分}\n{count|${course.studentCount}人}`
          },
          rich: {
            score: {
              color: '#0D9488',
              fontSize: 14,
              fontWeight: 'bold',
              padding: [0, 0, 3, 0]
            },
            count: {
              color: '#6B7280',
              fontSize: 11
            }
          },
          distance: 10
        }
      }]
    }

    chartInstance.current.setOption(option)

    const handleResize = () => chartInstance.current?.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chartInstance.current?.dispose()
    }
  }, [courses, totalStudents])

  // 计算平均满意度（保留一位小数）
  const averageScore = courses.length > 0 
    ? (courses.reduce((sum, c) => sum + c.avgScore, 0) / courses.length).toFixed(1) 
    : '0.0'

  return (
    <Card className="border-0 shadow-sm h-full">
      <CardHeader className="pb-5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-gray-900">{title}</CardTitle>
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          </div>
          <span className="px-2.5 py-1 bg-teal-100 text-teal-700 text-xs rounded-md font-medium">
            课程数据
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* 统计概览 */}
        <div className="flex items-center justify-around mb-6 py-5 bg-teal-50/50 rounded-xl">
          <div className="text-center px-4">
            <div className="text-xs text-gray-500 mb-1">课程总数</div>
            <div className="text-xl font-bold text-teal-600">{courses.length}<span className="text-sm font-normal text-gray-500 ml-0.5">门</span></div>
          </div>
          <div className="w-px h-10 bg-gray-200" />
          <div className="text-center px-4">
            <div className="text-xs text-gray-500 mb-1">学员总数</div>
            <div className="text-xl font-bold text-teal-600">{totalStudents}<span className="text-sm font-normal text-gray-500 ml-0.5">人</span></div>
          </div>
          <div className="w-px h-10 bg-gray-200" />
          <div className="text-center px-4">
            <div className="text-xs text-gray-500 mb-1">平均满意度</div>
            <div className="text-xl font-bold text-teal-600">{averageScore}<span className="text-sm font-normal text-gray-500 ml-0.5">分</span></div>
          </div>
        </div>

        {/* 图表区域 */}
        <div ref={chartRef} className="h-[300px]" />
      </CardContent>
    </Card>
  )
}
