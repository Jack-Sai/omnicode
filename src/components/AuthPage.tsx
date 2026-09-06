import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { User, Lock, Phone, UserPlus, LogIn, Sun, Moon } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { resolveTheme } from '../lib/theme';
import { Button, Card, Field, IconButton, Input } from './ui';
import { useTranslation } from '../i18n';

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
  const { t } = useTranslation();
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
      setError(`${t('auth.error.prefix')}${err}`);
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
          <img src="/logo.png" alt="Omni Code" className="mx-auto mb-4 h-11 w-11 rounded-lg shadow-sm" />
          <h1 className="text-lg font-semibold tracking-tight text-fg">Omni Code</h1>
          <p className="mt-1 text-sm text-fg-muted">{t('auth.subtitle')}</p>
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
                  {t('auth.login')}
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
                  {t('auth.register')}
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
            <Field label={t('auth.phone')}>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('auth.phone.placeholder')}
                leadingIcon={<Phone size={14} />}
                required
              />
            </Field>

            {mode === 'register' && (
              <Field label={t('auth.nickname')}>
                <Input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t('auth.nickname.placeholder')}
                  leadingIcon={<User size={14} />}
                  required
                />
              </Field>
            )}

            <Field label={t('auth.password')} hint={mode === 'register' ? t('auth.password.hint') : undefined}>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.password.placeholder')}
                leadingIcon={<Lock size={14} />}
                required
                minLength={6}
              />
            </Field>

            <Button type="submit" variant="primary" block disabled={loading}>
              {loading ? t('auth.processing') : mode === 'login' ? t('auth.login') : t('auth.register')}
            </Button>
          </form>

          <div className="mt-5 border-t border-line pt-4">
            <Button variant="ghost" block onClick={useDemoAccount}>
              {t('auth.skip')}
            </Button>
          </div>
        </Card>

        {/* 主题开关 */}
        <div className="mt-4 flex justify-center">
          <IconButton
            label={isDark ? t('sidebar.theme.light') : t('sidebar.theme.dark')}
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
