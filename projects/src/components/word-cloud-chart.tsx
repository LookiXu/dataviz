import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface WordCloudData {
  name: string
  value: number
}

interface WordCloudChartProps {
  data: WordCloudData[]
  title?: string
}

interface TooltipState {
  visible: boolean
  x: number
  y: number
  word: string
  count: number
}

// 扁平化配色 - 简洁高级色，与整体风格一致
const FLAT_COLORS = [
  '#64748B', // slate-500
  '#0D9488', // teal-600
  '#8B5CF6', // violet-500
  '#D97706', // amber-600
  '#059669', // emerald-600
  '#7C3AED', // violet-600
  '#0891B2', // cyan-600
  '#BE185D', // pink-700
]

export function WordCloudChart({ data, title = '评价关键词云' }: WordCloudChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    word: '',
    count: 0,
  })

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // 清空容器
    container.innerHTML = ''

    // 按词频排序
    const sortedData = [...data].sort((a, b) => b.value - a.value)
    const maxValue = sortedData[0]?.value || 1
    const minValue = sortedData[sortedData.length - 1]?.value || 0
    const valueRange = maxValue - minValue || 1

    // 字体大小计算 - 更克制的范围
    const getFontSize = (value: number) => {
      const ratio = (value - minValue) / valueRange
      return 13 + ratio * 19 // 13px - 32px
    }

    // 权重计算
    const getWeight = (value: number) => {
      const ratio = (value - minValue) / valueRange
      if (ratio > 0.8) return 700
      if (ratio > 0.5) return 600
      return 500
    }

    // 已放置区域
    const placedRects: { x: number; y: number; width: number; height: number }[] = []

    const checkCollision = (x: number, y: number, w: number, h: number) => {
      const padding = 24  // 增大间距，避免重叠
      for (const rect of placedRects) {
        if (
          x < rect.x + rect.width + padding &&
          x + w + padding > rect.x &&
          y < rect.y + rect.height + padding &&
          y + h + padding > rect.y
        ) {
          return true
        }
      }
      return false
    }

    // 优化的布局算法 - 均匀分布
    const placeWord = (wordWidth: number, wordHeight: number, rank: number) => {
      const centerX = width / 2
      const centerY = height / 2
      const maxRadius = Math.min(width, height) * 0.48

      // 前3个高频词优先放中心附近
      if (rank < 3) {
        const offsets = [
          { x: 0, y: 0 },
          { x: 60, y: -40 },
          { x: -70, y: 30 },
        ]
        for (const offset of offsets) {
          const x = centerX + offset.x - wordWidth / 2
          const y = centerY + offset.y - wordHeight / 2
          if (!checkCollision(x, y, wordWidth, wordHeight)) {
            placedRects.push({ x, y, width: wordWidth, height: wordHeight })
            return { x, y }
          }
        }
      }

      // 均匀螺旋布局
      const goldenAngle = Math.PI * (3 - Math.sqrt(5))
      const startRadius = 40 + rank * 8
      const radiusStep = 10

      for (let i = 0; i < 400; i++) {
        const angle = i * goldenAngle + rank * 0.3
        const radius = startRadius + i * radiusStep * 0.12

        if (radius > maxRadius) break

        const x = centerX + radius * Math.cos(angle) - wordWidth / 2
        const y = centerY + radius * Math.sin(angle) * 0.9 - wordHeight / 2

        // 边界检查
        const margin = 12
        if (
          x >= margin &&
          x + wordWidth <= width - margin &&
          y >= margin &&
          y + wordHeight <= height - margin
        ) {
          if (!checkCollision(x, y, wordWidth, wordHeight)) {
            placedRects.push({ x, y, width: wordWidth, height: wordHeight })
            return { x, y }
          }
        }
      }

      // 随机位置填充
      for (let i = 0; i < 80; i++) {
        const margin = 12
        const x = margin + Math.random() * (width - wordWidth - margin * 2)
        const y = margin + Math.random() * (height - wordHeight - margin * 2)
        if (!checkCollision(x, y, wordWidth, wordHeight)) {
          placedRects.push({ x, y, width: wordWidth, height: wordHeight })
          return { x, y }
        }
      }

      // 如果所有位置都有冲突，跳过该词（返回 null 表示不放置）
      return null
    }

    // 创建词元素
    sortedData.forEach((item, index) => {
      const color = FLAT_COLORS[index % FLAT_COLORS.length]
      const fontSize = getFontSize(item.value)
      const weight = getWeight(item.value)
      const isTop = index < 3

      // 计算尺寸
      const tempEl = document.createElement('span')
      tempEl.style.cssText = `
        position: absolute;
        visibility: hidden;
        font-size: ${fontSize}px;
        font-weight: ${weight};
        white-space: nowrap;
        padding: 8px 16px;
      `
      tempEl.textContent = item.name
      container.appendChild(tempEl)
      const rect = tempEl.getBoundingClientRect()
      container.removeChild(tempEl)

      const wordWidth = rect.width
      const wordHeight = rect.height
      const pos = placeWord(wordWidth, wordHeight, index)

      // 如果找不到合适位置，跳过该词
      if (!pos) return

      // 创建词元素 - 简洁高级风格
      const wordEl = document.createElement('div')
      wordEl.className = 'absolute cursor-pointer select-none transition-all duration-300 ease-out'
      wordEl.style.cssText = `
        left: ${pos.x}px;
        top: ${pos.y}px;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: ${fontSize}px;
        font-weight: ${weight};
        color: ${color};
        background: ${isTop ? `${color}15` : 'transparent'};
        white-space: nowrap;
        letter-spacing: ${isTop ? '0.5px' : '0'};
      `
      wordEl.textContent = item.name

      // 频次标签 - 右上角小数字
      const countBadge = document.createElement('span')
      countBadge.style.cssText = `
        display: inline-block;
        margin-left: 4px;
        padding: 2px 6px;
        font-size: 10px;
        font-weight: 600;
        color: ${isTop ? color : '#94A3B8'};
        background: ${isTop ? `${color}20` : '#F1F5F9'};
        border-radius: 4px;
        vertical-align: super;
      `
      countBadge.textContent = String(item.value)
      wordEl.appendChild(countBadge)

      // 简洁悬浮效果 + 交互提示
      wordEl.addEventListener('mouseenter', () => {
        wordEl.style.transform = 'translateY(-2px) scale(1.05)'
        wordEl.style.background = `${color}20`
        wordEl.style.boxShadow = `0 4px 20px ${color}20`
        wordEl.style.zIndex = '100'
        
        // 显示 tooltip
        const rect = wordEl.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()
        setTooltip({
          visible: true,
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top - 10,
          word: item.name,
          count: item.value,
        })
      })

      wordEl.addEventListener('mouseleave', () => {
        wordEl.style.transform = 'translateY(0) scale(1)'
        wordEl.style.background = isTop ? `${color}15` : 'transparent'
        wordEl.style.boxShadow = 'none'
        wordEl.style.zIndex = 'auto'
        
        // 隐藏 tooltip
        setTooltip(prev => ({ ...prev, visible: false }))
      })

      container.appendChild(wordEl)
    })

    // 响应式
    const handleResize = () => {}
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [data])

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-gray-900">
          {title}
        </CardTitle>
        <p className="text-sm text-gray-500">学员评价高频关键词 · 悬浮查看详情</p>
      </CardHeader>
      <CardContent>
        <div 
          ref={containerRef} 
          className="h-[380px] relative"
        >
          {/* 交互提示 Tooltip */}
          {tooltip.visible && (
            <div
              className="absolute pointer-events-none z-[200] animate-in fade-in-0 zoom-in-95 duration-200"
              style={{
                left: tooltip.x,
                top: tooltip.y,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap">
                <span className="font-medium">{tooltip.word}</span>
                <span className="text-gray-300 mx-2">·</span>
                <span className="text-teal-400">出现 {tooltip.count} 次</span>
              </div>
              {/* 小三角 */}
              <div 
                className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
                style={{
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: '6px solid #111827',
                }}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
