import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ViewerRankItem {
  name: string
  avgViewers: number
  liveCount: number
}

interface LiveViewerRankChartProps {
  data: ViewerRankItem[]
}

export function LiveViewerRankChart({ data }: LiveViewerRankChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return

    chartInstance.current = echarts.init(chartRef.current)

    // 按观看人数升序排列（图表从下到上显示）
    const sortedData = [...data].sort((a, b) => a.avgViewers - b.avgViewers)

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        textStyle: { color: '#374151' },
        formatter: (params: any) => {
          const item = params[0]
          const hostData = data.find(d => d.name === item.axisValue)
          return `
            <div class="font-medium">${item.axisValue}</div>
            <div class="text-violet-600">场均观看: ${item.value} 人</div>
            ${hostData ? `<div class="text-gray-500">直播场次: ${hostData.liveCount} 场</div>` : ''}
          `
        }
      },
      grid: {
        left: '15%',
        right: '18%',
        bottom: '8%',
        top: '8%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        name: '场均观看人数',
        nameTextStyle: { color: '#6B7280', fontSize: 12, padding: [0, 0, 0, -10] },
        axisLine: { show: true, lineStyle: { color: '#E5E7EB' } },
        axisTick: { show: false },
        axisLabel: { color: '#6B7280', fontSize: 12, margin: 10 },
        splitLine: { lineStyle: { color: '#F3F4F6', type: 'dashed' } }
      },
      yAxis: {
        type: 'category',
        data: sortedData.map(d => d.name),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#374151', fontSize: 13, margin: 16 }
      },
      series: [{
        type: 'bar',
        barWidth: 24,
        data: sortedData.map((d) => ({
          value: d.avgViewers,
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
          formatter: '{c} 人',
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

  // 统计信息
  const totalViewers = data.reduce((sum, d) => sum + d.avgViewers * d.liveCount, 0)
  const avgViewers = data.length > 0 ? Math.round(data.reduce((sum, d) => sum + d.avgViewers, 0) / data.length) : 0

  return (
    <Card className="border-0 shadow-sm h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-gray-900">主播场均观看人数排行</CardTitle>
            <p className="text-xs text-gray-500 mt-1">按场均观看人数排序</p>
          </div>
          <span className="px-2.5 py-1 bg-violet-100 text-violet-700 text-xs rounded-md font-medium">
            直播数据
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div ref={chartRef} className="h-[280px]" />
        
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">累计观看人次</p>
            <p className="text-lg font-bold text-violet-600">{totalViewers.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">平均场均观看</p>
            <p className="text-lg font-bold text-violet-600">{avgViewers.toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
