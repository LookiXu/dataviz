import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface NavbarProps {
  activeTab: string
  onNavigate?: (tab: string) => void
}

const navItems = [
  { id: 'overview', label: '首页概览' },
  { id: 'upload', label: '数据上传' },
  { id: 'analysis', label: '数据分析' },
  { id: 'dashboard', label: '可视化看板' },
]

export function Navbar({ activeTab, onNavigate }: NavbarProps) {
  const handleNavClick = (itemId: string) => {
    if (onNavigate) {
      onNavigate(itemId)
    } else {
      // 如果没有 onNavigate，使用 URL hash 导航
      window.location.hash = itemId
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100 overflow-hidden">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-14 h-14 object-cover"
            />
          </div>
          <span className="text-lg font-semibold text-gray-900">DataVizPro</span>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors relative',
                activeTab === item.id
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {item.label}
              {activeTab === item.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          ))}
        </nav>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8 bg-blue-600">
            <AvatarFallback className="bg-blue-600 text-white text-sm font-medium">
              CC
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-gray-600">徐成成</span>
        </div>
      </div>
    </header>
  )
}
