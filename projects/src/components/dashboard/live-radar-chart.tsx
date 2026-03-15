import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface RadarHost {
  id: string
  name: string
  scores: number[]  // [流量引力, 留存把控, 人气峰值, 互动氛围, 圈粉转化]
}

interface LiveRadarChartProps {
  hosts: RadarHost[]
}

// 雷达图维度 - 与后端顺序保持一致
const INDICATORS = [
  { name: '流量引力', max: 100 },
  { name: '留存把控', max: 100 },
  { name: '人气峰值', max: 100 },
  { name: '互动氛围', max: 100 },
  { name: '圈粉转化', max: 100 },
]

// 配色方案 - 支持最多 3 个主播
const COLORS = [
  { main: '#8B5CF6', gradient: ['rgba(139, 92, 246, 0.4)', 'rgba(139, 92, 246, 0.1)'] },
  { main: '#F59E0B', gradient: ['rgba(245, 158, 11, 0.4)', 'rgba(245, 158, 11, 0.1)'] },
  { main: '#0D9488', gradient: ['rgba(13, 148, 136, 0.4)', 'rgba(13, 148, 136, 0.1)'] },
]

export function LiveRadarChart({ hosts }: LiveRadarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current || hosts.length === 0) return

    chartInstance.current = echarts.init(chartRef.current)

    // 构建 series 数据
    const seriesData = hosts.map((host, index) => {
      const color = COLORS[index % COLORS.length]
      return {
        value: host.scores,
        name: host.name,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: color.gradient[0] },
            { offset: 1, color: color.gradient[1] },
          ]),
        },
        lineStyle: { width: 2, color: color.main },
        itemStyle: { color: color.main },
      }
    })

    const option: echarts.EChartsOption = {
      color: COLORS.map(c => c.main),
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        textStyle: { color: '#374151' },
      },
      legend: {
        data: hosts.map(h => h.name),
        bottom: 0,
        itemGap: 20,
        textStyle: { fontSize: 12, color: '#666' },
      },
      radar: {
        indicator: INDICATORS,
        center: ['50%', '45%'],
        radius: '60%',
        axisName: { color: '#666', fontSize: 12 },
        splitArea: {
          areaStyle: {
            color: ['rgba(139, 92, 246, 0.05)', 'rgba(139, 92, 246, 0.02)'],
          },
        },
        axisLine: { lineStyle: { color: 'rgba(139, 92, 246, 0.2)' } },
        splitLine: { lineStyle: { color: 'rgba(139, 92, 246, 0.2)' } },
      },
      series: [
        {
          name: '主播能力对比',
          type: 'radar',
          data: seriesData,
        },
      ],
    }

    chartInstance.current.setOption(option)

    const handleResize = () => chartInstance.current?.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chartInstance.current?.dispose()
    }
  }, [hosts])

  // 渲染维度得分卡片
  const renderScoreCards = () => (
    <div className="grid grid-cols-5 gap-2 mt-4">
      {INDICATORS.map((indicator, idx) => (
        <div key={indicator.name} className="text-center">
          <p className="text-xs text-gray-500 mb-1">{indicator.name}</p>
          <div className="flex items-center justify-center gap-1 flex-wrap">
            {hosts.map((host, hostIdx) => {
              const color = COLORS[hostIdx % COLORS.length]
              return (
                <span key={host.name} className="text-sm font-semibold" style={{ color: color.main }}>
                  {host.scores[idx]}
                  {hostIdx < hosts.length - 1 && <span className="text-gray-300 mx-1">/</span>}
                </span>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <Card className="border-0 shadow-sm h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-gray-900">主播多维能力对比</CardTitle>
            <p className="text-xs text-gray-500 mt-1">五维能力雷达图</p>
          </div>
          <span className="px-2.5 py-1 bg-violet-100 text-violet-700 text-xs rounded-md font-medium">
            直播数据
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div ref={chartRef} className="h-[280px]" />
        {renderScoreCards()}
      </CardContent>
    </Card>
  )
}
