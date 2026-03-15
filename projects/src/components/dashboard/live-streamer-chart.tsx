import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface StreamerData {
  name: string
  hours: number
}

interface StreamerChartProps {
  data: StreamerData[]
  title?: string
  subtitle?: string
}

export function LiveStreamerChart({ 
  data, 
  title = '多位主播场均观看时长',
  subtitle = 'AVERAGE WATCH TIME BY STREAMER'
}: StreamerChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    chartInstance.current = echarts.init(chartRef.current)

    const sortedData = [...data].sort((a, b) => a.hours - b.hours)

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        textStyle: { color: '#374151' },
        formatter: (params: any) => {
          const value = params[0]?.value || 0
          return `
            <div class="font-medium">${params[0]?.axisValue}</div>
            <div class="text-violet-600">场均时长: ${value} 分钟</div>
          `
        }
      },
      grid: {
        left: '15%',      // 增加左边距
        right: '15%',
        bottom: '8%',
        top: '8%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        name: '时长（分钟）',
        nameTextStyle: { 
          color: '#6B7280', 
          fontSize: 12,
          padding: [0, 0, 0, -10]
        },
        axisLine: { 
          show: true,
          lineStyle: { color: '#E5E7EB' }
        },
        axisTick: { show: false },
        axisLabel: { 
          color: '#6B7280',
          fontSize: 12,
          margin: 10
        },
        splitLine: { 
          lineStyle: { 
            color: '#F3F4F6',
            type: 'dashed'
          } 
        }
      },
      yAxis: {
        type: 'category',
        data: sortedData.map(d => d.name),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { 
          color: '#374151',
          fontSize: 13,
          margin: 16
        }
      },
      series: [{
        type: 'bar',
        barWidth: 24,
        data: sortedData.map((d) => ({
          value: d.hours,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#C4B5FD' },
              { offset: 1, color: '#8B5CF6' }
            ]),
            borderRadius: [0, 8, 8, 0]
          }
        })),
        label: {
          show: true,
          position: 'right',
          formatter: '{c} Min',
          color: '#8B5CF6',
          fontSize: 12,
          fontWeight: 'bold',
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
  }, [data])

  return (
    <Card className="border-0 shadow-sm h-full">
      <CardHeader className="pb-5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-gray-900">{title}</CardTitle>
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          </div>
          <span className="px-2.5 py-1 bg-violet-100 text-violet-700 text-xs rounded-md font-medium">
            直播数据
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div ref={chartRef} className="h-[320px]" />
      </CardContent>
    </Card>
  )
}
