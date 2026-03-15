import { useEffect, useRef, useMemo, useState } from 'react'
import * as echarts from 'echarts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface TrendDataItem {
  date: string
  topic: string
  host: string
  viewers: number
}

// 动态计算Y轴配置
function calculateYAxisConfig(values: number[]) {
  if (values.length === 0) return { yMin: 0, yMax: 2, interval: 0.5 }
  
  const maxValue = Math.max(...values)
  const minValue = Math.min(...values)

  // 动态计算最大值（向上取整到0.5的倍数）
  let yMax: number
  if (maxValue <= 1.5) {
    yMax = 2
  } else if (maxValue <= 2) {
    yMax = 2.5
  } else if (maxValue <= 2.5) {
    yMax = 3
  } else if (maxValue <= 3) {
    yMax = 3.5
  } else if (maxValue <= 4) {
    yMax = 5
  } else if (maxValue <= 6) {
    yMax = 8
  } else if (maxValue <= 10) {
    yMax = 12
  } else {
    yMax = Math.ceil(maxValue * 1.2 / 0.5) * 0.5
  }

  // 动态计算最小值
  let yMin: number
  if (minValue >= 1) {
    yMin = 1
  } else if (minValue >= 0.5) {
    yMin = 0.5
  } else {
    yMin = 0
  }

  // 动态计算间隔
  const range = yMax - yMin
  let interval: number
  if (range <= 2) {
    interval = 0.5
  } else if (range <= 4) {
    interval = 0.5
  } else if (range <= 6) {
    interval = 1
  } else {
    interval = Math.ceil(range / 8 * 2) / 2
  }

  return { yMin, yMax, interval }
}

export function TrendChart() {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const [trendData, setTrendData] = useState<TrendDataItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    console.log('[TrendChart] 开始获取趋势数据...')
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/overview/trend`)
      .then(res => res.json())
      .then(data => {
        console.log('[TrendChart] 趋势数据返回:', data)
        if (data.success && data.data?.trend) {
          setTrendData(data.data.trend)
        }
      })
      .catch(err => {
        console.error('[TrendChart] 获取趋势数据失败:', err)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const { dates, values, yAxisConfig } = useMemo(() => {
    if (trendData.length === 0) return { dates: [], values: [], yAxisConfig: { yMin: 0, yMax: 2, interval: 0.5 } }
    const dates = trendData.map(d => d.date)
    const values = trendData.map(d => d.viewers)
    const yAxisConfig = calculateYAxisConfig(values)
    return { dates, values, yAxisConfig }
  }, [trendData])

  useEffect(() => {
    if (!chartRef.current || trendData.length === 0) return

    chartInstance.current = echarts.init(chartRef.current)

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        padding: [12, 16],
        textStyle: {
          color: '#374151',
          fontSize: 13,
        },
        extraCssText: 'box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); border-radius: 8px;',
        formatter: (params: any) => {
          const dataIndex = params[0]?.dataIndex || 0
          const data = trendData[dataIndex]
          if (!data) return ''
          return `
            <div style="font-weight: 600; margin-bottom: 8px; color: #111827;">
              ${data.date}
            </div>
            <div style="margin-bottom: 4px;">
              <span style="color: #6B7280;">直播主题：</span>
              <span style="color: #111827; font-weight: 500;">${data.topic}</span>
            </div>
            <div style="margin-bottom: 4px;">
              <span style="color: #6B7280;">主播：</span>
              <span style="color: #8B5CF6; font-weight: 600;">${data.host}</span>
            </div>
            <div>
              <span style="color: #6B7280;">观看人数：</span>
              <span style="color: #8B5CF6; font-weight: 700; font-size: 15px;">${data.viewers}k</span>
            </div>
          `
        },
      },
      grid: {
        left: '2%',
        right: '3%',
        bottom: '40px',
        top: '50px',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        name: '直播日期',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: {
          color: '#6B7280',
          fontSize: 13,
          fontWeight: 500,
        },
        axisLine: {
          lineStyle: {
            color: '#E5E7EB',
          },
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: '#6B7280',
          fontSize: 12,
          margin: 14,
        },
      },
      yAxis: {
        type: 'value',
        name: '观看人数（k）',
        nameLocation: 'end',
        nameGap: 10,
        nameTextStyle: {
          color: '#6B7280',
          fontSize: 13,
          fontWeight: 500,
        },
        min: yAxisConfig.yMin,
        max: yAxisConfig.yMax,
        interval: yAxisConfig.interval,
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: '#6B7280',
          fontSize: 12,
          formatter: '{value}',
        },
        splitLine: {
          lineStyle: {
            color: '#F3F4F6',
            type: 'dashed',
          },
        },
      },
      series: [
        {
          name: '观看人数',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: {
            width: 3,
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#8B5CF6' },
              { offset: 1, color: '#A78BFA' },
            ]),
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(139, 92, 246, 0.3)' },
              { offset: 1, color: 'rgba(139, 92, 246, 0.05)' },
            ]),
          },
          itemStyle: {
            color: '#8B5CF6',
            borderWidth: 2,
            borderColor: '#fff',
            shadowColor: 'rgba(139, 92, 246, 0.4)',
            shadowBlur: 8,
          },
          emphasis: {
            scale: 1.3,
            itemStyle: {
              shadowBlur: 15,
              shadowColor: 'rgba(139, 92, 246, 0.6)',
            },
          },
          data: values,
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
  }, [dates, values, yAxisConfig, trendData])

  return (
    <Card className="border-0 shadow-sm bg-white h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">
              直播观看趋势
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              最近10场直播观看人数变化趋势
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="w-3 h-3 rounded-full bg-purple-500" />
            <span>总观看人数</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : trendData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-gray-400">
            暂无趋势数据
          </div>
        ) : (
          <div ref={chartRef} className="h-[300px]" />
        )}
      </CardContent>
    </Card>
  )
}
