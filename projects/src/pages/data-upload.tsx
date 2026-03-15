import { useState, useEffect } from 'react'
import { Upload, FileCheck, AlertCircle, Table, Database, Users, BookOpen } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { FileUploadZone } from '@/components/file-upload-zone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ValidationResult,
  LIVE_RECORD_FIELDS,
  COURSE_FEEDBACK_FIELDS,
  DataType,
} from '@/lib/csv-validator'

// 模拟主播数据（实际应从后端 API 获取）
const MOCK_HOSTS = [
  { id: '1', name: 'Wayne' },
  { id: '2', name: 'Leo' },
  { id: '3', name: 'Jayson' },
  { id: '4', name: 'Vivi老师' },
    { id: '5', name: 'Anna' }
]

// 模拟课程数据（实际应从后端 API 获取）
const MOCK_COURSES = [
  { id: '1', name: '公众演讲课' },
  { id: '2', name: '生涯规划课' },
  { id: '3', name: '人际情商课' },
  { id: '4', name: '美式口语课' },
    { id: '5', name: 'AI应用课' },
]

export function DataUploadPage() {
  const [dataType, setDataType] = useState<DataType>('live')
  const [relatedObject, setRelatedObject] = useState<string>('')
  const [relatedObjects, setRelatedObjects] = useState<{ id: string; name: string }[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null)

  // 根据数据类型动态加载关联对象（结合后端接口）
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        // 先用本地假数据兜底
        let hosts = MOCK_HOSTS;
        let courses = MOCK_COURSES;
        
        // 尝试从后端获取真实的去重名单
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/metadata`);
        if (response.ok) {
          const data = await response.json();
          
          // 【全维防御 + 智能去重】
          // 1. 过滤双人组合 2. 大小写合并 3. 去重
          if (data.hosts && data.hosts.length > 0) {
            const nameMap = new Map<string, { id: string; name: string }>();
            
            data.hosts.forEach((h: any, idx: number) => {
              const rawName = typeof h === 'string' ? h : (h.name || '');
              const id = typeof h === 'string' ? String(idx + 1) : h.id;
              
              // 过滤：空值、双人组合（& 或 、）
              if (!rawName || rawName.includes('&') || rawName.includes('、')) return;
              
              // 大小写合并：以小写为 key，保留首次出现的原始格式
              const key = rawName.toUpperCase();
              if (!nameMap.has(key)) {
                nameMap.set(key, { id, name: rawName });
              }
            });
            
            hosts = Array.from(nameMap.values());
          }
          if (data.courses && data.courses.length > 0) courses = data.courses;
        }
        // 根据当前选中的数据类型更新下拉框
        if (dataType === 'live') {
          setRelatedObjects(hosts);
          setRelatedObject(hosts.length > 0 ? hosts[0].id : '');
        } else {
          setRelatedObjects(courses);
          setRelatedObject(courses.length > 0 ? courses[0].id : '');
        }
      } catch (error) {
        console.error('获取后端元数据失败，使用本地默认数据', error);
        // 失败时使用兜底逻辑
        if (dataType === 'live') {
          setRelatedObjects(MOCK_HOSTS);
          setRelatedObject(MOCK_HOSTS[0].id);
        } else {
          setRelatedObjects(MOCK_COURSES);
          setRelatedObject(MOCK_COURSES[0].id);
        }
      }
    };

    loadMetadata();

    // 清空已选择的文件和验证结果
    setSelectedFile(null)
    setValidation(null)
    setUploadResult(null)
  }, [dataType])

  const handleFileSelect = (file: File, validationResult: ValidationResult) => {
    setSelectedFile(file)
    setValidation(validationResult)
    setUploadResult(null)
  }

  const handleUpload = async () => {
    if (!selectedFile || !relatedObject) return

    setIsUploading(true)
    setUploadResult(null)
    
    try {
      // 1. 严格拼装后端需要的 FormData
      const formData = new FormData()
      formData.append('file', selectedFile)
      // dataType 刚好是 'live' 或 'course'，完美契合后端的 upload_type 要求
      formData.append('upload_type', dataType) 
      
      // 【新增】：提取当前下拉框选中的中文名称，传给后端用于强制关联
      const objectName = relatedObjects.find(o => o.id === relatedObject)?.name || ''
      formData.append('related_name', objectName)
      
      // 2. 发起真实上传请求
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      })
      
      const result = await response.json()
      
      if (response.ok) {
        setUploadResult({
          success: true,
          message: `上传成功！共写入 ${result.records_inserted} 条数据。`,
        })
      } else {
        throw new Error(result.detail || '上传失败')
      }
    } catch (error: any) {
      setUploadResult({
        success: false,
        message: `上传失败: ${error.message}`,
      })
    } finally {
      setIsUploading(false) // ✅ 正确的代码：恢复上传按钮为可用状态
    }
  }

  // 根据数据类型获取字段配置
  const fieldConfig = dataType === 'live' ? LIVE_RECORD_FIELDS : COURSE_FEEDBACK_FIELDS

  // 获取上传框边框颜色
  const getUploadBorderColor = () => {
    return dataType === 'live' ? 'border-violet-500' : 'border-teal-600'
  }

  // 获取品牌色系
  const getBrandColors = () => {
    return dataType === 'live' 
      ? {
          bg: 'bg-violet-50',
          text: 'text-violet-600',
          iconBg: 'bg-violet-100',
          gradient: 'from-violet-50 to-purple-50',
          button: 'bg-violet-600 hover:bg-violet-700',
          ring: 'focus:ring-violet-500',
        }
      : {
          bg: 'bg-teal-50',
          text: 'text-teal-600',
          iconBg: 'bg-teal-100',
          gradient: 'from-teal-50 to-emerald-50',
          button: 'bg-teal-600 hover:bg-teal-700',
          ring: 'focus:ring-teal-500',
        }
  }

  const colors = getBrandColors()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar activeTab="upload" />
      
      <main className="flex-1 container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">数据上传</h1>
          <p className="text-gray-500 mt-1">
            支持上传 CSV 或 Excel 格式的数据文件，系统将自动校验字段并导入数据库。
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left: Upload Zone */}
          <div className="col-span-2 space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
                    <Upload className={`w-5 h-5 ${colors.text}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">上传数据文件</CardTitle>
                    <p className="text-sm text-gray-500">选择数据类型并关联对象后上传文件</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 数据类型选择 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Database className="w-4 h-4 text-gray-400" />
                      数据类型
                    </label>
                    <select
                      value={dataType}
                      onChange={(e) => setDataType(e.target.value as DataType)}
                      className={`flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 ${colors.ring} focus:ring-offset-2 cursor-pointer`}
                    >
                      <option value="live">
                        直播数据
                      </option>
                      <option value="course">
                        课程反馈
                      </option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      {dataType === 'live' ? (
                        <Users className="w-4 h-4 text-gray-400" />
                      ) : (
                        <BookOpen className="w-4 h-4 text-gray-400" />
                      )}
                      关联{dataType === 'live' ? '主播' : '课程'}
                    </label>
                    <select
                      value={relatedObject}
                      onChange={(e) => setRelatedObject(e.target.value)}
                      className={`flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 ${colors.ring} focus:ring-offset-2 cursor-pointer`}
                    >
                      {relatedObjects.map((obj) => (
                        <option key={obj.id} value={obj.id}>
                          {obj.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 文件上传区域 - 动态边框颜色 */}
                <div className={`border-2 border-dashed rounded-xl transition-colors ${getUploadBorderColor()}`}>
                  <FileUploadZone 
                    onFileSelect={handleFileSelect} 
                    dataType={dataType}
                  />
                </div>
                
                {validation && !validation.valid && (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-900">字段校验失败</p>
                        {validation.missingFields.length > 0 && (
                          <p className="text-sm text-red-700 mt-1">
                            缺少必需字段: {validation.missingFields.join('、')}
                          </p>
                        )}
                        {validation.matchedFields.length > 0 && (
                          <p className="text-sm text-gray-600 mt-2">
                            已成功匹配字段: {validation.matchedFields.join('、')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {uploadResult && (
                  <div className={`p-4 rounded-lg border ${
                    uploadResult.success 
                      ? 'bg-green-50 border-green-100' 
                      : 'bg-red-50 border-red-100'
                  }`}>
                    <div className="flex items-center gap-3">
                      <FileCheck className={`w-5 h-5 ${
                        uploadResult.success ? 'text-green-500' : 'text-red-500'
                      }`} />
                      <p className={uploadResult.success ? 'text-green-900' : 'text-red-900'}>
                        {uploadResult.message}
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end">
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || isUploading || !relatedObject}
                    className={colors.button}
                  >
                    {isUploading ? '上传中...' : '确认上传'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Field Mapping Info - 动态字段映射表格 */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Table className="w-5 h-5 text-gray-500" />
                  <CardTitle className="text-lg">
                    字段映射说明
                    <span className={`ml-2 text-sm font-normal px-2 py-1 rounded-full ${colors.bg} ${colors.text}`}>
                      {dataType === 'live' ? '直播数据' : '课程反馈'}
                    </span>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-3 font-medium text-gray-500">CSV 字段名</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-500">数据库字段</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-500">类型</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {fieldConfig.map((field) => (
                        <tr key={field.csvField} className="hover:bg-gray-50/50">
                          <td className="py-2 px-3">
                            {field.required ? (
                              <Badge variant="default" className={`${dataType === 'live' ? 'bg-violet-100 text-violet-700 hover:bg-violet-100' : 'bg-teal-100 text-teal-700 hover:bg-teal-100'}`}>
                                必需
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-100">
                                可选
                              </Badge>
                            )}
                            <span className="ml-2">{field.csvField}</span>
                            {field.aliases && field.aliases.length > 0 && (
                              <span className="text-xs text-gray-400 ml-1">
                                (别名: {field.aliases.join(', ')})
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono text-gray-600">{field.schemaField}</td>
                          <td className="py-2 px-3 text-gray-500">{field.type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Help & Tips */}
          <div className="space-y-6">
            <Card className={`border-0 shadow-sm bg-gradient-to-br ${colors.gradient}`}>
              <CardHeader>
                <CardTitle className="text-lg">上传须知</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-gray-600">
                <div className="flex gap-3">
                  <div className={`w-6 h-6 rounded-full ${colors.iconBg} flex items-center justify-center shrink-0 ${colors.text} font-medium text-xs`}>1</div>
                  <p>文件格式支持 CSV、XLSX、XLS</p>
                </div>
                <div className="flex gap-3">
                  <div className={`w-6 h-6 rounded-full ${colors.iconBg} flex items-center justify-center shrink-0 ${colors.text} font-medium text-xs`}>2</div>
                  <p>
                    {dataType === 'live' 
                      ? '必需字段：话题、主播、直播日期、直播时长(min)、累计观看人数、场观'
                      : '必需字段：课程名称、讲师姓名、评价日期、总体评分'
                    }
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className={`w-6 h-6 rounded-full ${colors.iconBg} flex items-center justify-center shrink-0 ${colors.text} font-medium text-xs`}>3</div>
                  <p>日期格式建议统一为 YYYY-MM-DD</p>
                </div>
                <div className="flex gap-3">
                  <div className={`w-6 h-6 rounded-full ${colors.iconBg} flex items-center justify-center shrink-0 ${colors.text} font-medium text-xs`}>4</div>
                  <p>Excel 文件将在后端解析校验</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">最近上传</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-500 text-center py-8">
                  暂无上传记录
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
