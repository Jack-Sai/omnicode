import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { User, Lock, Phone, UserPlus, LogIn } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface AuthUser {
  id: string;
  phone: string;
  display_name: string;
  created_at: string;
  last_login: string | null;
}

interface AuthResponse {
  success: boolean;
  message: string;
  user: AuthUser | null;
  token: string | null;
}

export function AuthPage() {
  const { setCurrentUser, setAuthToken } = useAppStore();
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let response: AuthResponse;

      if (isLogin) {
        response = await invoke<AuthResponse>('login_user', {
          request: { phone, password },
        });
      } else {
        response = await invoke<AuthResponse>('register_user', {
          request: { phone, password, display_name: displayName },
        });
      }

      if (response.success && response.user && response.token) {
        setCurrentUser(response.user);
        setAuthToken(response.token);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(`操作失败: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl mb-4">
            <span className="text-3xl">🤖</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Omni Code</h1>
          <p className="text-gray-500 mt-1">为代码而生的本地智能体</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {/* Tab Switch */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => {
                setIsLogin(true);
                setError('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                isLogin
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LogIn size={16} />
              登录
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                !isLogin
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <UserPlus size={16} />
              注册
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
              <div className="relative">
                <Phone
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="请输入手机号"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Display Name (Register only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">显示名称</label>
                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="请输入显示名称"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '处理中...' : isLogin ? '登录' : '注册'}
            </button>
          </form>

          {/* Demo Mode */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => {
                // 跳过登录，直接进入 demo 模式
                setCurrentUser({
                  id: 'demo-user',
                  phone: '13800138000',
                  display_name: 'Demo 用户',
                  created_at: new Date().toISOString(),
                  last_login: null,
                });
                setAuthToken('demo-token');
              }}
              className="w-full py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              跳过登录，直接体验
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
