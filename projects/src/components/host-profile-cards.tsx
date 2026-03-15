import { AlertTriangle, User, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Host {
  id: string
  name: string
  strengths: string[]
  weaknesses: string[]
  recordCount?: number
}

interface HostProfileCardsProps {
  hosts: Host[]
  selectedIds: string[]
}

// 配色方案 - 与雷达图保持一致
const COLORS = [
  { main: '#8B5CF6', bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', light: 'bg-violet-100' },
  { main: '#F59E0B', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', light: 'bg-amber-100' },
  { main: '#0D9488', bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', light: 'bg-teal-100' },
]

export function HostProfileCards({ hosts, selectedIds }: HostProfileCardsProps) {
  // 只显示选中的主播
  const selectedHosts = hosts.filter(h => selectedIds.includes(h.id))

  if (selectedHosts.length === 0) {
    return (
      <Card className="border-0 shadow-sm h-full">
        <CardContent className="flex items-center justify-center h-full text-gray-400">
          <div className="text-center">
            <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">请选择主播查看详情</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {selectedHosts.map((host, index) => {
        const color = COLORS[index % COLORS.length]
        
        return (
          <Card 
            key={host.id} 
            className={`border-0 shadow-sm overflow-hidden ${color.bg}`}
          >
            {/* 顶部彩色条 */}
            <div 
              className="h-1.5"
              style={{ backgroundColor: color.main }}
            />
            
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle 
                  className="text-base font-bold"
                  style={{ color: color.main }}
                >
                  {host.name}
                </CardTitle>
                {host.recordCount && (
                  <Badge 
                    variant="secondary" 
                    className={`${color.light} ${color.text} border-0 rounded-full px-2.5 py-0.5 text-xs`}
                  >
                    {host.recordCount} 场直播
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="pt-0 pb-4">
              {/* 优势区域 */}
              <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs font-medium text-gray-600">优势</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {host.strengths.map((strength, idx) => (
                    <Badge 
                      key={idx}
                      className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md px-2 py-0.5 text-xs font-normal"
                    >
                      {strength}
                    </Badge>
                  ))}
                </div>
              </div>
              
              {/* 不足区域 */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-medium text-gray-600">待提升</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {host.weaknesses.map((weakness, idx) => (
                    <Badge 
                      key={idx}
                      className="bg-amber-50 text-amber-700 border border-amber-200 rounded-md px-2 py-0.5 text-xs font-normal"
                    >
                      {weakness}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}


