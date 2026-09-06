import { useAppStore } from '../store/useAppStore';
import { Moon, Sun, Monitor, Shield, Zap, Eye, LogOut, User } from 'lucide-react';
import type { ExecutionMode } from '../types';

export function SettingsView() {
  const { settings, updateSettings, currentUser, logout } = useAppStore();

  const executionModes: { id: ExecutionMode; name: string; description: string; icon: React.ReactNode; color: string }[] = [
    {
      id: 'manual',
      name: '手动审批',
      description: '所有中风险及以上操作需要你确认',
      icon: <Shield size={20} />,
      color: 'text-blue-500 bg-blue-50',
    },
    {
      id: 'auto',
      name: '自动审批',
      description: '低风险自动执行，中高风险根据置信度判断',
      icon: <Eye size={20} />,
      color: 'text-green-500 bg-green-50',
    },
    {
      id: 'full',
      name: '完全访问',
      description: '所有操作直接执行，无需审批（谨慎使用）',
      icon: <Zap size={20} />,
      color: 'text-red-500 bg-red-50',
    },
  ];

  const themes = [
    { id: 'light' as const, name: '浅色', icon: <Sun size={18} /> },
    { id: 'dark' as const, name: '深色', icon: <Moon size={18} /> },
    { id: 'system' as const, name: '跟随系统', icon: <Monitor size={18} /> },
  ];

  return (
    <div className="flex-1 bg-gray-50 p-6 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">设置</h1>
          <p className="text-sm text-gray-500 mt-1">自定义你的 Omni Code 体验</p>
        </div>

        {/* User Info */}
        {currentUser && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User size={24} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="font-medium text-gray-800">{currentUser.display_name}</h2>
                  <p className="text-sm text-gray-500">{currentUser.phone}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut size={18} />
                <span>退出登录</span>
              </button>
            </div>
          </div>
        )}

        {/* Execution Mode */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">执行模式</h2>
          <p className="text-sm text-gray-500 mb-4">
            控制 Agent 执行操作时的审批行为
          </p>

          <div className="space-y-3">
            {executionModes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => updateSettings({ executionMode: mode.id })}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                  settings.executionMode === mode.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`p-2 rounded-lg ${mode.color}`}>{mode.icon}</div>
                <div className="flex-1">
                  <div className="font-medium text-gray-800">{mode.name}</div>
                  <div className="text-sm text-gray-500">{mode.description}</div>
                </div>
                {settings.executionMode === mode.id && (
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          {settings.executionMode === 'full' && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">
                ⚠️ 完全访问模式下，所有操作将直接执行，包括文件删除和代码执行。请确保你了解潜在风险。
              </p>
            </div>
          )}
        </div>

        {/* Theme */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">外观</h2>

          <div className="flex gap-3">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => updateSettings({ theme: theme.id })}
                className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  settings.theme === theme.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    settings.theme === theme.id ? 'text-blue-500' : 'text-gray-500'
                  }`}
                >
                  {theme.icon}
                </div>
                <span className="text-sm font-medium text-gray-700">{theme.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">语言</h2>

          <div className="flex gap-3">
            <button
              onClick={() => updateSettings({ language: 'zh' })}
              className={`flex-1 py-3 rounded-xl border-2 transition-all ${
                settings.language === 'zh'
                  ? 'border-blue-500 bg-blue-50 text-blue-600'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              中文
            </button>
            <button
              onClick={() => updateSettings({ language: 'en' })}
              className={`flex-1 py-3 rounded-xl border-2 transition-all ${
                settings.language === 'en'
                  ? 'border-blue-500 bg-blue-50 text-blue-600'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* About */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">关于</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>产品名称: Omni Code</p>
            <p>版本: 0.1.0</p>
            <p>技术栈: Tauri v2 + React + TypeScript</p>
          </div>
        </div>
      </div>
    </div>
  );
}
