import { Activity, Database, Cpu, HelpCircle } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-green-500" />
              <span>本地计算引擎已就绪 (v2.4.1)</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-blue-500" />
              <span>离线数据库状态: 正常 (3.2 GB / 10 GB)</span>
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-gray-400" />
              <span>CPU: 8%  RAM: 1.2 GB</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1 hover:text-gray-700 transition-colors">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>帮助与反馈</span>
            </button>
            <span className="text-gray-400">|</span>
            <span>© 2026 Guangdong Buiyun University</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
