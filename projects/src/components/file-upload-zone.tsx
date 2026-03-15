import { useState, useCallback } from 'react'
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { validateCSVHeaders, ValidationResult, parseCSVHeaders, DataType } from '@/lib/csv-validator'

interface FileUploadZoneProps {
  onFileSelect: (file: File, validation: ValidationResult) => void
  accept?: string
  dataType?: DataType
}

export function FileUploadZone({ 
  onFileSelect, 
  accept = '.csv,.xlsx,.xls',
  dataType = 'live'
}: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>('')

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const validateFile = async (file: File): Promise<ValidationResult> => {
    setIsValidating(true)
    setDebugInfo('正在读取文件...')
    
    try {
      // 检查文件类型
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
      
      if (isExcel) {
        // Excel 文件：由于前端无法直接解析，先返回警告，让后端处理
        setDebugInfo('Excel 文件，将交由后端解析')
        return {
          valid: true, // 暂时通过，后端会再次校验
          missingFields: [],
          matchedFields: ['Excel 文件'],
          extraFields: [],
          typeErrors: [],
          warnings: ['Excel 文件将在后端进行字段校验'],
        }
      }
      
      // CSV 文件：前端解析校验
      const text = await file.text()
      setDebugInfo('正在解析表头...')
      
      // 使用新的解析函数
      const headers = parseCSVHeaders(text)
      setDebugInfo(`识别到 ${headers.length} 个字段: ${headers.join(', ')}`)
      
      const result = validateCSVHeaders(headers, dataType)
      
      // 添加文件类型警告
      if (!file.name.endsWith('.csv')) {
        result.warnings.push('建议上传 CSV 格式文件以获得最佳兼容性')
      }
      
      setDebugInfo(`校验结果: 通过=${result.valid}, 匹配字段=${result.matchedFields.length}, 缺少字段=${result.missingFields.length}`)
      
      return result
    } catch (error) {
      setDebugInfo('解析错误: ' + (error as Error).message)
      return {
        valid: false,
        missingFields: [],
        matchedFields: [],
        extraFields: [],
        typeErrors: [],
        warnings: ['文件解析失败: ' + (error as Error).message],
      }
    } finally {
      setIsValidating(false)
    }
  }

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      setSelectedFile(file)
      
      const validationResult = await validateFile(file)
      setValidation(validationResult)
      onFileSelect(file, validationResult)
    }
  }, [onFileSelect, dataType])

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      setSelectedFile(file)
      
      const validationResult = await validateFile(file)
      setValidation(validationResult)
      onFileSelect(file, validationResult)
    }
  }, [onFileSelect, dataType])

  const handleClear = useCallback(() => {
    setSelectedFile(null)
    setValidation(null)
    setDebugInfo('')
  }, [])

  // 如果已选择文件，显示文件信息
  if (selectedFile) {
    return (
      <div className="h-[180px] w-full rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-6 flex flex-col">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 h-12 rounded-lg bg-violet-100 flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6 text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{selectedFile.name}</p>
            <p className="text-sm text-gray-500">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
            {debugInfo && (
              <p className="text-xs text-gray-400 mt-1">{debugInfo}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {isValidating ? (
          <p className="mt-3 text-sm text-gray-500 flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            正在校验字段...
          </p>
        ) : validation && (
          <div className="mt-3">
            {validation.valid ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">
                  字段校验通过 ({validation.matchedFields.length} 个字段匹配)
                </span>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-red-500">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">字段校验失败</p>
                  {validation.missingFields.length > 0 && (
                    <p className="mt-1">
                      缺少必需字段: {validation.missingFields.join('、')}
                    </p>
                  )}
                  {validation.warnings.length > 0 && validation.warnings.some(w => w.includes('识别到')) && (
                    <p className="mt-1 text-gray-500">
                      {validation.warnings.find(w => w.includes('识别到'))}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'h-[180px] w-full rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center cursor-pointer',
        isDragOver
          ? 'border-violet-400 bg-violet-50'
          : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50'
      )}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="hidden"
        id="file-upload"
      />
      <label
        htmlFor="file-upload"
        className="flex flex-col items-center justify-center w-full h-full cursor-pointer"
      >
        <div className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors',
          isDragOver ? 'bg-violet-100' : 'bg-gray-100'
        )}>
          <Upload className={cn(
            'w-5 h-5 transition-colors',
            isDragOver ? 'text-violet-600' : 'text-gray-400'
          )} />
        </div>
        <p className="text-sm font-medium text-gray-700">
          {isDragOver ? '松开以上传文件' : '点击或拖拽文件至此'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          支持 CSV、Excel 格式
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {dataType === 'live' 
            ? '必需字段: 话题、主播、直播日期、时长、场观、累计观看'
            : '必需字段: 课程名称、讲师姓名、评价日期、总体评分'
          }
        </p>
      </label>
    </div>
  )
}
