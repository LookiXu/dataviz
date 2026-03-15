import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2, Users } from 'lucide-react'

// 主播完整数据类型
interface HostData {
  id: string
  name: string
  scores: number[]  // [流量引力, 留存把控, 人气峰值, 互动氛围, 圈粉转化]
  strengths: string[]
  weaknesses: string[]
}

interface ComplementaryRecommendationProps {
  selectedHostIds: string[]
  hostNames: string[]
  hosts: HostData[]  // 完整的主播数据列表
}

export function ComplementaryRecommendation({ 
  selectedHostIds, 
  hostNames,
  hosts
}: ComplementaryRecommendationProps) {
  const [recommendation, setRecommendation] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    if (selectedHostIds.length < 2) {
      setRecommendation('⚠️ 请至少选择两位主播进行对比分析')
      return
    }

    // 获取选中的主播数据
    const selectedHosts = hosts.filter(h => selectedHostIds.includes(h.id))
    
    console.log('[AI推荐] 选中的主播:', selectedHosts)
    
    if (selectedHosts.length < 2) {
      setRecommendation('⚠️ 无法获取主播数据')
      return
    }

    // 构建后端期望的参数格式
    const hostA = selectedHosts[0]
    const hostB = selectedHosts[1]

    // 前端校验：scores 数组长度必须为 5
    if (!hostA.scores || hostA.scores.length !== 5) {
      setRecommendation(`⚠️ ${hostA.name} 的评分数据异常（长度: ${hostA.scores?.length || 0}），应为5维评分`)
      return
    }
    if (!hostB.scores || hostB.scores.length !== 5) {
      setRecommendation(`⚠️ ${hostB.name} 的评分数据异常（长度: ${hostB.scores?.length || 0}），应为5维评分`)
      return
    }

    const requestBody = {
      hostA: {
        name: hostA.name,
        scores: hostA.scores,
        strengths: hostA.strengths || [],
        weaknesses: hostA.weaknesses || []
      },
      hostB: {
        name: hostB.name,
        scores: hostB.scores,
        strengths: hostB.strengths || [],
        weaknesses: hostB.weaknesses || []
      }
    }

    console.log('[AI推荐] 发送请求:', requestBody)

    setIsGenerating(true)
    setRecommendation('')

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/ai/recommendation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()
      console.log('[AI推荐] 后端响应:', data)
      
      if (data.success) {
        // 显示推荐内容
        let result = data.recommendation || 'AI 分析完成'
        
        // 如果有预期提升，追加显示
        if (data.expectedImprovement) {
          result += `\n\n📊 预期提升：\n${data.expectedImprovement}`
        }
        
        setRecommendation(result)
      } else {
        // 显示详细错误信息
        let errorMsg = data.error || '生成失败，请稍后重试'
        
        // 如果有额外的调试信息
        if (data.hostA_scores_length) {
          errorMsg += `\n（hostA scores 长度: ${data.hostA_scores_length}）`
        }
        if (data.hostB_scores_length) {
          errorMsg += `\n（hostB scores 长度: ${data.hostB_scores_length}）`
        }
        
        setRecommendation(`⚠️ ${errorMsg}`)
      }
    } catch (err) {
      console.error('[AI推荐] 请求失败:', err)
      setRecommendation('⚠️ 网络请求失败，请检查后端服务是否正常运行')
    } finally {
      setIsGenerating(false)
    }
  }

  const canGenerate = selectedHostIds.length >= 2

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-r from-violet-50/50 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
            <Users className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-gray-900">
              智能推荐：互补主播组合
            </CardTitle>
            <p className="text-xs text-gray-500">
              {canGenerate 
                ? `已选择 ${hostNames.join(' 与 ')}` 
                : '请至少选择两位主播'
              }
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* 说明文案 */}
        <div className="flex items-start gap-3 mb-4 p-3 bg-white/60 rounded-lg border border-violet-100">
          <Users className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
          <p className="text-sm text-gray-600 leading-relaxed">
            基于主播数据，AI 将分析双方优势并生成互补合作建议，帮助主播相互学习、共同提升。
          </p>
        </div>

        {/* 生成按钮 */}
        <Button 
          onClick={handleGenerate}
          disabled={!canGenerate || isGenerating}
          className="w-full bg-violet-600 hover:bg-violet-700 text-white shadow-sm transition-all disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              AI 分析中...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              生成互补推荐
            </>
          )}
        </Button>

        {/* 推荐内容展示 */}
        {recommendation && (
          <div className="mt-4 p-4 bg-white rounded-xl border border-violet-100/50">
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {recommendation}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
