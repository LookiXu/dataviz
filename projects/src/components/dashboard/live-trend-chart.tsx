import { useEffect, useRef, useMemo } from 'react'
import * as echarts from 'echarts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'

interface TrendChartProps {
  data: {
    dates: string[]
    values: number[]
    previousValues?: number[]
  }
  title?: string
  subtitle?: string
  colorStart?: string
  colorEnd?: string
}

// 动态计算Y轴配置
function calculateYAxisConfig(values: number[], previousValues?: number[]) {
  // 合并所有数据值
  const allValues = previousValues ? [...values, ...previousValues] : values
  const maxValue = Math.max(...allValues, 0.1)  // 避免全0情况
  const minValue = Math.min(...allValues, 0)

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

  // 动态计算最小值（对于直播数据，从1开始更合适）
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

export function LiveTrendChart({
  data,
  title = '7日总观看人数趋势',
  subtitle = 'AUDIENCE GROWTH TREND',
  colorStart = '#8B5CF6',
  colorEnd = '#A78BFA'
}: TrendChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  // 判断是否有数据
  const hasData = data.dates.length > 0 && data.values.length > 0

  // 计算Y轴配置
  const yAxisConfig = useMemo(() => {
    if (!hasData) return { yMin: 0, yMax: 2, interval: 0.5 }
    return calculateYAxisConfig(data.values, data.previousValues)
  }, [data.values, data.previousValues, hasData])

  useEffect(() => {
    if (!chartRef.current || !hasData) return

    chartInstance.current = echarts.init(chartRef.current)

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        textStyle: { color: '#374151' },
        formatter: (params: any) => {
          const current = params[0]?.value || 0
          const previous = params[1]?.value || 0
          const growth = previous ? ((current - previous) / previous * 100).toFixed(1) : 0
          return `
            <div class="font-medium">${params[0]?.axisValue}</div>
            <div class="text-violet-600">本期: ${current}k</div>
            ${previous ? `<div class="text-gray-500">上期: ${previous}k</div>` : ''}
            ${growth ? `<div class="text-green-600">↑ ${growth}%</div>` : ''}
          `
        }
      },
      grid: {
        left: '10%',
        right: '6%',
        bottom: '12%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: data.dates,
        name: '日期',
        nameLocation: 'middle',
        nameGap: 28,
        nameTextStyle: {
          color: '#6B7280',
          fontSize: 12,
          fontWeight: 500
        },
        axisLine: { lineStyle: { color: '#E5E7EB' } },
        axisLabel: {
          color: '#6B7280',
          fontSize: 12,
          margin: 14
        },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        name: '观看人数（k）',
        nameLocation: 'end',
        nameGap: 10,
        nameTextStyle: {
          color: '#6B7280',
          fontSize: 12,
          fontWeight: 500
        },
        min: yAxisConfig.yMin,
        max: yAxisConfig.yMax,
        interval: yAxisConfig.interval,
        axisLine: {
          show: false
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
      series: [
        {
          name: '本期',
          type: 'line' as const,
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: {
            width: 3,
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: colorStart },
              { offset: 1, color: colorEnd }
            ])
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: colorStart + '40' },
              { offset: 1, color: colorEnd + '10' }
            ])
          },
          itemStyle: {
            color: colorStart,
            borderWidth: 2,
            borderColor: '#fff',
            shadowColor: colorStart + '40',
            shadowBlur: 6
          },
          emphasis: {
            scale: 1.2,
            itemStyle: {
              shadowBlur: 10,
              shadowColor: colorStart + '60'
            }
          },
          data: data.values
        },
        ...(data.previousValues ? [{
          name: '上期',
          type: 'line' as const,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            width: 2,
            type: 'dashed' as const,
            color: '#9CA3AF'
          },
          data: data.previousValues
        }] : [])
      ]
    }

    chartInstance.current.setOption(option)

    const handleResize = () => chartInstance.current?.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chartInstance.current?.dispose()
    }
  }, [data, colorStart, colorEnd, yAxisConfig, hasData])

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
        {hasData ? (
          <>
            <div ref={chartRef} className="h-[300px]" />
            <div className="flex items-center justify-center gap-8 mt-4 text-xs">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-violet-500" />
                <span className="text-gray-600">当前周期</span>
              </span>
              {data.previousValues && (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-0.5 bg-gray-400" />
                  <span className="text-gray-600">上期对比</span>
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="h-[300px] flex flex-col items-center justify-center text-gray-400">
            <TrendingUp className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">暂无趋势数据</p>
            <p className="text-xs text-gray-300 mt-1">请先上传直播数据</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
