import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Trash2, Loader2, Sparkles, CheckCircle2 } from 'lucide-react'

interface TodoItem {
  id: number | string
  title: string
  completed: boolean
  priority: 'high' | 'medium' | 'low'
  createdAt: string
}

const API_BASE = `${import.meta.env.VITE_API_BASE_URL}/api/todos`

export function TodoList() {
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newTodo, setNewTodo] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  
  // IME 输入法编辑状态标记（解决中文输入时回车误提交问题）
  const isComposingRef = useRef(false)

  // 获取待办列表
  const fetchTodos = useCallback(async () => {
    try {
      console.log('[TodoList] 获取待办列表...')
      const res = await fetch(API_BASE)
      const data = await res.json()
      console.log('[TodoList] 获取结果:', data)
      if (data.success && data.data?.todos) {
        setTodos(data.data.todos)
      }
    } catch (err) {
      console.error('[TodoList] 获取待办失败:', err)
      // 如果后端未就绪，使用本地存储
      const localTodos = localStorage.getItem('todos')
      if (localTodos) {
        setTodos(JSON.parse(localTodos))
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  // 保存到本地存储（作为备份）
  useEffect(() => {
    if (todos.length > 0) {
      localStorage.setItem('todos', JSON.stringify(todos))
    }
  }, [todos])

  // 添加待办
  const handleAddTodo = async () => {
    if (!newTodo.trim()) return
    
    setIsAdding(true)

    try {
      // 使用 form-urlencoded 格式
      const formData = new URLSearchParams()
      formData.append('title', newTodo.trim())
      formData.append('priority', 'medium')

      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      })
      const data = await res.json()
      console.log('[TodoList] 添加结果:', data)
      if (data.success && data.data?.todo) {
        setTodos(prev => [data.data.todo, ...prev])
        setNewTodo('')
      }
    } catch (err) {
      console.error('[TodoList] 添加待办失败:', err)
      // 本地添加
      const localTodo: TodoItem = {
        id: Date.now(),
        title: newTodo.trim(),
        completed: false,
        priority: 'medium',
        createdAt: new Date().toISOString(),
      }
      setTodos(prev => [localTodo, ...prev])
      setNewTodo('')
    } finally {
      setIsAdding(false)
    }
  }

  // 切换完成状态
  const handleToggle = async (id: number | string, completed: boolean) => {
    const newCompleted = !completed
    
    // 乐观更新
    setTodos(prev => 
      prev.map(t => t.id === id ? { ...t, completed: newCompleted } : t)
    )

    try {
      // 使用 form-urlencoded 格式，布尔值转为字符串
      const formData = new URLSearchParams()
      formData.append('completed', newCompleted ? 'true' : 'false')

      await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      })
    } catch (err) {
      console.error('[TodoList] 更新状态失败:', err)
    }
  }

  // 删除待办
  const handleDelete = async (id: number | string) => {
    // 乐观删除
    setTodos(prev => prev.filter(t => t.id !== id))

    try {
      await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
      })
    } catch (err) {
      console.error('[TodoList] 删除失败:', err)
    }
  }

  // 统计
  const completedCount = todos.filter(t => t.completed).length
  const totalCount = todos.length

  return (
    <Card className="border-0 shadow-sm bg-white overflow-hidden h-full">
      {/* Header - 苹果风格渐变背景 */}
      <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-violet-50 border-b border-purple-100/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center shadow-lg shadow-purple-200">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-base font-semibold text-gray-900">
              待办任务
            </CardTitle>
          </div>
          {totalCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-white/80 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" />
              <span>{completedCount}/{totalCount}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {/* 添加待办输入框 */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Input
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => {
                // 只有在不处于输入法编辑状态时，回车才提交
                if (e.key === 'Enter' && !isComposingRef.current) {
                  handleAddTodo()
                }
              }}
              onCompositionStart={() => {
                // 输入法开始编辑（如中文拼音输入）
                isComposingRef.current = true
              }}
              onCompositionEnd={() => {
                // 输入法结束编辑
                isComposingRef.current = false
              }}
              placeholder="添加新任务..."
              className="h-10 bg-gray-50/50 border-gray-200/60 focus:border-purple-300 focus:ring-purple-100 rounded-xl text-sm placeholder:text-gray-400"
            />
          </div>
          <Button
            onClick={handleAddTodo}
            disabled={isAdding || !newTodo.trim()}
            className="h-10 w-10 rounded-xl bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 shadow-md shadow-purple-200 disabled:opacity-50"
          >
            {isAdding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* 待办列表 */}
        <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
            </div>
          ) : todos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-sm">暂无待办任务</p>
              <p className="text-xs text-gray-300 mt-1">添加一个任务开始吧</p>
            </div>
          ) : (
            todos.map((todo) => (
              <div
                key={todo.id}
                className={`group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                  todo.completed 
                    ? 'bg-gray-50/50' 
                    : 'hover:bg-purple-50/50 hover:shadow-sm'
                }`}
              >
                {/* Checkbox */}
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={() => handleToggle(todo.id, todo.completed)}
                  className={`rounded-md ${
                    todo.completed 
                      ? 'border-gray-300 bg-gray-100' 
                      : 'border-purple-300 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500'
                  }`}
                />

                {/* Title */}
                <span
                  className={`flex-1 text-sm transition-all duration-200 ${
                    todo.completed
                      ? 'text-gray-400 line-through'
                      : 'text-gray-700'
                  }`}
                >
                  {todo.title}
                </span>

                {/* Delete Button */}
                <button
                  onClick={() => handleDelete(todo.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all duration-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* 进度条 */}
        {totalCount > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>完成进度</span>
              <span className="font-medium text-purple-600">{Math.round((completedCount / totalCount) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
