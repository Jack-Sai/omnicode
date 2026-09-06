import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { User, Lock, Phone, UserPlus, LogIn, Sun, Moon } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { resolveTheme } from '../lib/theme';
import { Button, Card, Field, IconButton, Input } from './ui';

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

type Mode = 'login' | 'register';

export function AuthPage() {
  const { setCurrentUser, setAuthToken, settings, updateSettings } = useAppStore();
  const [mode, setMode] = useState<Mode>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isDark = resolveTheme(settings.theme) === 'dark';

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response: AuthResponse =
        mode === 'login'
          ? await invoke<AuthResponse>('login_user', { request: { phone, password } })
          : await invoke<AuthResponse>('register_user', {
              request: { phone, password, display_name: displayName },
            });

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

  const useDemoAccount = () => {
    setCurrentUser({
      id: 'demo-user',
      phone: '13800138000',
      display_name: 'Demo 用户',
      created_at: new Date().toISOString(),
      last_login: null,
    });
    setAuthToken('demo-token');
  };

  return (
    <div className="flex h-full w-full items-center justify-center overflow-y-auto bg-app p-4">
      <div className="w-full max-w-sm">
        {/* 品牌 */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-base font-bold text-accent-solid shadow-sm">
            O
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-fg">Omni Code</h1>
          <p className="mt-1 text-sm text-fg-muted">为代码而生的本地智能体</p>
        </div>

        <Card padding="lg" className="shadow-md">
          {/* 登录 / 注册切换 */}
          <div className="relative z-0 mb-5 overflow-hidden rounded-md bg-surface p-1">
            {/* 滑动的激活指示块 */}
            <span
              className={`absolute inset-y-1 left-1 z-0 w-[calc(50%-4px)] rounded-md bg-accent shadow-sm transition-transform duration-300 ease-out ${
                mode === 'register' ? 'translate-x-full' : ''
              }`}
            />
            <div className="relative z-10 flex">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                  mode === 'login' ? 'text-accent-solid' : 'text-fg-secondary hover:text-fg'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <LogIn size={14} />
                  登录
                </span>
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                  mode === 'register' ? 'text-accent-solid' : 'text-fg-secondary hover:text-fg'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <UserPlus size={14} />
                  注册
                </span>
              </button>
            </div>
          </div>

          {error && (
            <p className="mb-4 rounded-md border border-danger-line bg-danger-subtle px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="手机号">
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入手机号"
                leadingIcon={<Phone size={14} />}
                required
              />
            </Field>

            {mode === 'register' && (
              <Field label="显示名称">
                <Input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="请输入显示名称"
                  leadingIcon={<User size={14} />}
                  required
                />
              </Field>
            )}

            <Field label="密码" hint={mode === 'register' ? '至少 6 位' : undefined}>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                leadingIcon={<Lock size={14} />}
                required
                minLength={6}
              />
            </Field>

            <Button type="submit" variant="primary" block disabled={loading}>
              {loading ? '处理中…' : mode === 'login' ? '登录' : '注册'}
            </Button>
          </form>

          <div className="mt-5 border-t border-line pt-4">
            <Button variant="ghost" block onClick={useDemoAccount}>
              跳过登录，直接体验
            </Button>
          </div>
        </Card>

        {/* 主题开关 */}
        <div className="mt-4 flex justify-center">
          <IconButton
            label={isDark ? '切换到浅色' : '切换到深色'}
            size="sm"
            onClick={() => updateSettings({ theme: isDark ? 'light' : 'dark' })}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </IconButton>
        </div>
      </div>
    </div>
  );
}
