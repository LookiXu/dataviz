/**
 * CSV 字段与 Prisma Schema 的映射配置
 * 
 * 规则:
 * - 必需字段: required = true
 * - 可选字段: required = false
 * - 字段映射: csvField -> schemaField
 * - 数据类型: string | number | date | percentage
 */

export interface FieldMapping {
  csvField: string        // CSV 中的表头名称
  schemaField: string     // Prisma Schema 中的字段名
  required: boolean       // 是否必需
  type: 'string' | 'number' | 'date' | 'percentage'
  description: string     // 字段描述
  aliases?: string[]      // 别名列表（兼容不同命名）
}

// 直播数据字段映射
export const LIVE_RECORD_FIELDS: FieldMapping[] = [
  { 
    csvField: '话题', 
    schemaField: 'topic', 
    required: true, 
    type: 'string', 
    description: '直播话题',
    aliases: ['主题', '标题']
  },
  { 
    csvField: '主播', 
    schemaField: 'hostName', 
    required: true, 
    type: 'string', 
    description: '主播姓名',
    aliases: ['主播姓名', '主持人', '讲师']
  },
  { 
    csvField: '直播日期', 
    schemaField: 'liveDate', 
    required: true, 
    type: 'date', 
    description: '直播日期',
    aliases: ['日期', '时间']
  },
  { 
    csvField: '直播时长(min)', 
    schemaField: 'durationMinutes', 
    required: true, 
    type: 'number', 
    description: '直播时长(分钟)',
    aliases: ['直播时长', '时长', '时长(分钟)', '直播时长（min）']
  },
  { 
    csvField: '累计观看人数', 
    schemaField: 'totalViewers', 
    required: true, 
    type: 'number', 
    description: '累计观看人数',
    aliases: ['累计观看', '总观看人数', '观看人数']
  },
  { 
    csvField: '场观', 
    schemaField: 'liveViewers', 
    required: true, 
    type: 'number', 
    description: '场观人数',
    aliases: ['直播间观看', '直播间人数']
  },
  { csvField: '预约人数', schemaField: 'reservationCount', required: false, type: 'number', description: '预约人数' },
  { csvField: '预约观看人数', schemaField: 'reservationCount', required: false, type: 'number', description: '预约观看人数(别名)' },
  { csvField: '预约-观看转化率', schemaField: 'reservationRate', required: false, type: 'percentage', description: '预约-观看转化率' },
  { csvField: '人均观看时长', schemaField: 'avgWatchDuration', required: false, type: 'number', description: '人均观看时长(分钟)' },
  { csvField: '最高在线人数', schemaField: 'maxOnlineUsers', required: false, type: 'number', description: '最高在线人数' },
  { csvField: '关注率', schemaField: 'followRate', required: false, type: 'percentage', description: '关注率(%)' },
  { csvField: '互动率', schemaField: 'interactionRate', required: false, type: 'percentage', description: '互动率(%)' },
  { csvField: '分享率', schemaField: 'shareRate', required: false, type: 'percentage', description: '分享率(%)' },
  { csvField: '新增关注', schemaField: 'newFollowers', required: false, type: 'number', description: '新增关注数' },
  { csvField: '成交订单数', schemaField: 'orderCount', required: false, type: 'number', description: '成交订单数' },
  { csvField: '加微率', schemaField: 'wechatAddRate', required: false, type: 'percentage', description: '加微率(%)' },
  { csvField: '加微', schemaField: 'viralTrafficCount', required: false, type: 'number', description: '加微人数(裂变人数)' },
]

// 课程反馈字段映射
export const COURSE_FEEDBACK_FIELDS: FieldMapping[] = [
  {
    csvField: '课程名称',
    schemaField: 'courseName',
    required: true,
    type: 'string',
    description: '课程名称',
    aliases: ['课程', '课程标题']
  },
  {
    csvField: '讲师姓名',
    schemaField: 'instructorName',
    required: true,
    type: 'string',
    description: '讲师姓名',
    aliases: ['讲师', '主讲人']
  },
  {
    csvField: '评价日期',
    schemaField: 'feedbackDate',
    required: true,
    type: 'date',
    description: '评价日期',
    aliases: ['日期', '反馈日期']
  },
  {
    csvField: '总体评分',
    schemaField: 'overallRating',
    required: true,
    type: 'number',
    description: '总体评分(1-5)',
    aliases: ['评分', '课程评分', '总体评价']
  },
  {
    csvField: '内容评分',
    schemaField: 'contentRating',
    required: false,
    type: 'number',
    description: '内容评分(1-5)',
    aliases: ['内容评价']
  },
  {
    csvField: '讲师评分',
    schemaField: 'instructorRating',
    required: false,
    type: 'number',
    description: '讲师评分(1-5)',
    aliases: ['讲师评价']
  },
  {
    csvField: '互动评分',
    schemaField: 'interactionRating',
    required: false,
    type: 'number',
    description: '互动评分(1-5)',
    aliases: ['互动评价']
  },
  {
    csvField: '评价内容',
    schemaField: 'feedbackContent',
    required: false,
    type: 'string',
    description: '评价内容/评论',
    aliases: ['评论', '反馈内容', '评价文本']
  },
  {
    csvField: '学员姓名',
    schemaField: 'studentName',
    required: false,
    type: 'string',
    description: '学员姓名',
    aliases: ['学员', '用户姓名']
  },
  {
    csvField: '是否推荐',
    schemaField: 'isRecommended',
    required: false,
    type: 'string',
    description: '是否推荐(是/否)',
    aliases: ['推荐']
  },
]

// 数据类型
export type DataType = 'live' | 'course'

// CSV 中额外字段（非必需但可接受）
export const OPTIONAL_CSV_FIELDS = [
  '停留',
  '成交人数',
  '第一波成交单数',
  '第二波成交单数',
  '第三波成交单数',
  '点击成交转化率',
  '观看成交转化率',
]

export interface ValidationResult {
  valid: boolean
  missingFields: string[]
  matchedFields: string[]
  extraFields: string[]
  typeErrors: { field: string; expected: string; actual: string }[]
  warnings: string[]
}

/**
 * 清理字段名（去除空格、BOM、引号等）
 */
function cleanFieldName(field: string): string {
  return field
    .replace(/^\uFEFF/, '') // 去除 BOM
    .replace(/^["']|["']$/g, '') // 去除引号
    .trim() // 去除首尾空格
    .replace(/\s+/g, '') // 去除所有空格
}

/**
 * 检查字段是否匹配（支持别名）
 */
function matchField(inputField: string, mapping: FieldMapping): boolean {
  const cleaned = cleanFieldName(inputField)
  const possibleNames = [
    mapping.csvField,
    ...(mapping.aliases || [])
  ].map(cleanFieldName)
  
  return possibleNames.includes(cleaned)
}

/**
 * 验证 CSV 表头是否符合 Schema 要求
 */
export function validateCSVHeaders(headers: string[], dataType: DataType = 'live'): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    missingFields: [],
    matchedFields: [],
    extraFields: [],
    typeErrors: [],
    warnings: [],
  }

  // 根据数据类型选择字段配置
  const fieldConfig = dataType === 'live' ? LIVE_RECORD_FIELDS : COURSE_FEEDBACK_FIELDS
  const requiredFields = fieldConfig.filter(f => f.required)
  
  // 检查必需字段
  for (const field of requiredFields) {
    const isMatched = headers.some(h => matchField(h, field))
    if (isMatched) {
      result.matchedFields.push(field.csvField)
    } else {
      result.missingFields.push(field.csvField)
    }
  }

  // 检查额外字段
  const validFields = [
    ...fieldConfig.flatMap(f => [f.csvField, ...(f.aliases || [])]),
    ...(dataType === 'live' ? OPTIONAL_CSV_FIELDS : []),
  ].map(cleanFieldName)
  
  for (const header of headers) {
    const cleaned = cleanFieldName(header)
    if (!validFields.includes(cleaned)) {
      result.extraFields.push(header)
    }
  }

  // 如果有缺少的必需字段，验证失败
  if (result.missingFields.length > 0) {
    result.valid = false
  }

  // 添加调试信息
  result.warnings.push(`识别到的字段: ${result.matchedFields.join(', ') || '无'}`)

  return result
}

/**
 * 解析 CSV 表头（支持各种格式）
 */
export function parseCSVHeaders(fileContent: string): string[] {
  const lines = fileContent.split(/\r?\n/)
  if (lines.length === 0) return []
  
  // 解析第一行（表头）
  const headerLine = lines[0]
  
  // 处理 Excel 导出的 CSV（可能使用制表符分隔）
  if (headerLine.includes('\t')) {
    return headerLine.split('\t').map(h => h.trim())
  }
  
  // 标准 CSV 解析（处理引号内的逗号）
  const headers: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < headerLine.length; i++) {
    const char = headerLine[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      headers.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  // 添加最后一个字段
  if (current.trim()) {
    headers.push(current.trim())
  }
  
  return headers
}

/**
 * 获取字段映射关系说明
 */
export function getFieldMappingDescription(dataType: DataType = 'live'): string {
  const fields = dataType === 'live' ? LIVE_RECORD_FIELDS : COURSE_FEEDBACK_FIELDS
  const lines: string[] = []
  lines.push('CSV 字段与数据库字段映射关系：')
  lines.push('')
  
  for (const field of fields) {
    const required = field.required ? '【必需】' : '【可选】'
    lines.push(`${required} ${field.csvField} → ${field.schemaField} (${field.description})`)
  }
  
  return lines.join('\n')
}
