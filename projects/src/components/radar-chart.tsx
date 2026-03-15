import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface HostData {
  name: string
  scores: number[]
}

interface RadarChartProps {
  data: Record<string, HostData>
}

// 【核心修改】：精准对齐后端的真实直播五维模型
const INDICATORS = [
  { name: '流量引力', max: 100 }, // 对应：累计观看人数
  { name: '留存把控', max: 100 }, // 对应：人均观看时长
  { name: '人气峰值', max: 100 }, // 对应：最高在线人数
  { name: '互动氛围', max: 100 }, // 对应：互动率
  { name: '圈粉转化', max: 100 }, // 对应：关注率
]

// 配色方案 - 支持最多 3 个主播
const COLORS = [
  { 
    main: '#8B5CF6', 
    gradient: ['rgba(139, 92, 246, 0.4)', 'rgba(139, 92, 246, 0.1)'],
    text: 'text-violet-600'
  },
  { 
    main: '#F59E0B', 
    gradient: ['rgba(245, 158, 11, 0.4)', 'rgba(245, 158, 11, 0.1)'],
    text: 'text-amber-500'
  },
  { 
    main: '#0D9488', 
    gradient: ['rgba(13, 148, 136, 0.4)', 'rgba(13, 148, 136, 0.1)'],
    text: 'text-teal-600'
  },
]

export function RadarChart({ data }: RadarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  // 将数据转换为数组格式
  const hosts = Object.values(data)

  useEffect(() => {
    if (!chartRef.current || hosts.length === 0) return

    // 初始化图表
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
        lineStyle: {
          width: 2,
          color: color.main,
        },
        itemStyle: {
          color: color.main,
        },
      }
    })

    const option: echarts.EChartsOption = {
      color: COLORS.map(c => c.main),
      tooltip: {
        trigger: 'item',
      },
      legend: {
        data: hosts.map(h => h.name),
        bottom: 0,
        itemGap: 20,
        textStyle: {
          fontSize: 12,
          color: '#666',
        },
      },
      radar: {
        indicator: INDICATORS,
        center: ['50%', '45%'],
        radius: '65%',
        axisName: {
          color: '#666',
          fontSize: 12,
        },
        splitArea: {
          areaStyle: {
            color: ['rgba(139, 92, 246, 0.05)', 'rgba(139, 92, 246, 0.02)'],
          },
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(139, 92, 246, 0.2)',
          },
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(139, 92, 246, 0.2)',
          },
        },
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

    // 响应式
    const handleResize = () => {
      chartInstance.current?.resize()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chartInstance.current?.dispose()
    }
  }, [data, hosts])

  // 构建维度得分卡片数据
  const renderScoreCards = () => {
    return INDICATORS.map((indicator, index) => (
      <div key={indicator.name} className="text-center">
        <p className="text-xs text-gray-500 mb-1">{indicator.name}</p>
        <div className="flex items-center justify-center gap-1 flex-wrap">
          {hosts.map((host, hostIndex) => {
            const color = COLORS[hostIndex % COLORS.length]
            return (
              <span 
                key={host.name} 
                className="text-sm font-semibold"
                style={{ color: color.main }}
              >
                {host.scores[index]}
                {hostIndex < hosts.length - 1 && (
                  <span className="text-gray-300 mx-1">/</span>
                )}
              </span>
            )
          })}
        </div>
      </div>
    ))
  }

  return (
    <Card className="border-0 shadow-sm h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-gray-900">
          主播多维能力对比
        </CardTitle>
        <p className="text-sm text-gray-500">五维能力雷达图分析</p>
      </CardHeader>
      <CardContent>
        <div ref={chartRef} className="h-[300px]" />
        
        {/* 维度得分卡片 */}
        <div className="grid grid-cols-5 gap-3 mt-4">
          {renderScoreCards()}
        </div>
      </CardContent>
    </Card>
  )
}
