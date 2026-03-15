# 主播选择功能与数据关联逻辑规划

## 1. 功能需求

### 1.1 主播选择功能
- **入口位置**: 数据分析页面左侧，新增主播选择区域
- **展示内容**:
  - 已上传的所有主播列表（头像 + 昵称）
  - 复选框或卡片选择模式
  - 最多支持选择 2 个主播进行
  
### 1.2 数据关联
- 主播ID关联已上传的 CSV 数据
- 动态获取选中主播的评分数据（五维雷达）
- 动态生成主播画像（优势/不足分析）
- 基于选中主播数据生成 AI 互补推荐

## 2. 数据结构设计

```typescript
// 主播基础信息
interface Host {
  id: string
  name: string
  avatar?: string
  department?: string
}

// 主播详细数据
interface HostData {
  id: string
  name: string
  scores: [number, number, number, number, number] // 专业度、节奏感、转化率、互动率、留存率
  // 可扩展更多维度
}

// 主播画像
interface HostProfile {
  hostId: string
  hostName: string
  strengths: string[]
  weaknesses: string[]
  styleTag?: string // 如"知识型"、"互动型"
}

// AI 推荐结果
interface AIRecommendation {
  recommendation: string
  expectedImprovement: string
  confidence: number
}
```

## 3. 组件规划

### 3.1 HostSelector 组件
```typescript
// src/components/host-selector.tsx
interface HostSelectorProps {
  hosts: Host[]
  selectedHostIds: string[]
  maxSelection: number
  onSelectionChange: (selectedIds: string[]) => void
}
```

### 3.2 修改后的页面结构
```
分析页面
├── Header（页面标题）
├── 主播选择区域（新增）
│   └── HostSelector
├── 雷达图
│   └── RadarChart（根据选中主播动态渲染）
├── 主播画像（上下排布）
│   └── HostProfileCards
├── AI 互补推荐
│   └── ComplementaryRecommendation
└── 课程分析
    └── WordCloudChart + AI总结
```

## 4. API 接口规划

### 4.1 获取主播列表
```
GET /api/hosts

Response:
{
  success: boolean
  data: Host[]
}
```

### 4.2 获取主播详细数据
```
GET /api/hosts/:id/data

Response:
{
  success: boolean
  data: HostData
  profile: HostProfile
}
```

### 4.3 AI 互补推荐（已有，需调整参数）
```
POST /api/ai/recommendation

Request Body:
{
  hostIds: string[] // 选中主播的ID
}
```

## 5. 状态管理

### 5.1 页面级状态 (AnalysisPage)
```typescript
const [hosts, setHosts] = useState<Host[]>([]) // 所有主播
const [selectedHostIds, setSelectedHostIds] = useState<string[]>([]) // 选中主播
const [hostDataMap, setHostDataMap] = useState<Map<string, HostData>>(new Map())
const [hostProfiles, setHostProfiles] = useState<Map<string, HostProfile>>(new Map())
```

### 5.2 数据流
```
1. 页面加载 -> 获取主播列表 -> 渲染 HostSelector
2. 用户选择主播 -> 更新 selectedHostIds
3. 选中变化 -> 获取选中主播的详细数据
4. 数据更新 -> 重新渲染雷达图和主播画像
5. 点击生成推荐 -> 基于当前选中主播调用 AI API
```

## 6. 交互流程

```
[用户进入分析页面]
    ↓
[显示主播选择区域，默认选中前两个主播]
    ↓
[加载选中主播的数据，渲染雷达图和画像]
    ↓
[用户可切换选中的主播（最多2个）]
    ↓
[数据自动更新，图表重新渲染]
    ↓
[用户点击"生成互补推荐"]
    ↓
[调用 AI API，展示推荐结果]
```

## 7. 样式设计

### 7.1 主播选择器样式
- 卡片式布局，每个主播一个小卡片
- 选中状态：紫色边框高亮
- 最多选择2个，超出时提示
- 使用紫色系 (#8B5CF6) 与直播板块保持一致

### 7.2 空状态处理
- 未选择主播时：显示"请选择主播进行对比"
- 只选择1个主播时：雷达图只显示一个
- 选择2个主播时：完整对比模式

## 8. 实现优先级

1. **P0**: 主播选择器 UI 组件
2. **P0**: 主播列表 API
3. **P1**: 主播数据获取与状态管理
4. **P1**: 动态更新雷达图和画像
5. **P2**: AI 推荐 API 参数调整
6. **P2**: 空状态与边界处理

## 9. 当前已完成

- ✅ 主播画像上下布局
- ✅ 词云气泡与文字比例优化
- ⏳ 主播选择功能（待实现）
- ⏳ 数据关联逻辑（待实现）
