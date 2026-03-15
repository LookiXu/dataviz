/**
 * 日志工具 - 生产环境自动禁用调试日志
 */

const isDev = import.meta.env.VITE_ENABLE_CONSOLE_LOG === 'true'

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log('[DataVizPro]', ...args)
  },
  
  info: (...args: any[]) => {
    if (isDev) console.info('[DataVizPro]', ...args)
  },
  
  warn: (...args: any[]) => {
    // 警告日志在生产环境也保留
    console.warn('[DataVizPro]', ...args)
  },
  
  error: (...args: any[]) => {
    // 错误日志始终输出
    console.error('[DataVizPro]', ...args)
  },
  
  debug: (...args: any[]) => {
    if (isDev) console.debug('[DataVizPro]', ...args)
  },
  
  group: (label: string) => {
    if (isDev) console.group(label)
  },
  
  groupEnd: () => {
    if (isDev) console.groupEnd()
  },
}

// API 基础地址
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
