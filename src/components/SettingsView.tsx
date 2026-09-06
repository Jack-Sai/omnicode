import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { Moon, Sun, Monitor, Shield, Zap, Eye, LogOut, User, Check, Info, ExternalLink, Save } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button, Card, CardHeader, Page, PageHeader, Segmented, type SegmentedOption } from './ui';
import type { ExecutionMode } from '../types';

const EXECUTION_MODES: {
  id: ExecutionMode;
  name: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'manual',
    name: '手动审批',
    description: '所有中风险及以上操作都需要你确认',
    icon: <Shield size={16} />,
  },
  {
    id: 'auto',
    name: '自动审批',
    description: '低风险自动执行，中高风险根据置信度判断',
    icon: <Eye size={16} />,
  },
  {
    id: 'full',
    name: '完全访问',
    description: '所有操作直接执行，无需审批（谨慎使用）',
    icon: <Zap size={16} />,
  },
];

const THEME_OPTIONS: SegmentedOption<'light' | 'dark' | 'system'>[] = [
  { value: 'light', label: '浅色', icon: <Sun size={14} /> },
  { value: 'dark', label: '深色', icon: <Moon size={14} /> },
  { value: 'system', label: '跟随系统', icon: <Monitor size={14} /> },
];

const LANGUAGE_OPTIONS: SegmentedOption<'zh' | 'en'>[] = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
];

const ABOUT_ROWS = [
  { label: '产品名称', value: 'Omni Code' },
  { label: '版本', value: '0.1.0' },
  { label: '技术栈', value: 'Tauri v2 + React + TypeScript' },
  { label: 'GitHub', value: 'github.com/Jack-Sai/omnicode', href: 'https://github.com/Jack-Sai/omnicode' },
];

export function SettingsView() {
  const { settings, updateSettings, currentUser, logout } = useAppStore();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const applySettings = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await invoke('save_settings', {
        userId: currentUser?.id ?? null,
        settings,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('保存设置失败:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      <PageHeader title="设置" description="自定义你的 Omni Code 体验" className="mb-6" />

      {/* 账户 */}
      {currentUser && (
        <Card padding="lg" className="mb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent-line bg-accent-subtle text-accent">
                <User size={18} />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-fg">
                  {currentUser.display_name}
                </h2>
                <p className="truncate text-xs text-fg-muted">{currentUser.phone}</p>
              </div>
            </div>
            <Button variant="secondary" icon={<LogOut size={15} />} onClick={logout}>
              退出登录
            </Button>
          </div>
        </Card>
      )}

      {/* 执行模式 */}
      <Card padding="lg" className="mb-4">
        <CardHeader
          title="执行模式"
          description="控制 Agent 执行操作时的审批行为"
          className="mb-4"
        />
        <div className="space-y-2">
          {EXECUTION_MODES.map((mode) => {
            const active = settings.executionMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => updateSettings({ executionMode: mode.id })}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]',
                  active
                    ? 'border-accent bg-accent-subtle'
                    : 'border-line bg-surface hover:bg-surface-hover'
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border',
                    active
                      ? 'border-accent-line bg-surface text-accent'
                      : 'border-line bg-inset text-fg-secondary'
                  )}
                >
                  {mode.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-fg">{mode.name}</span>
                  <span className="block text-xs text-fg-muted">{mode.description}</span>
                </span>
                {active && <Check size={16} className="shrink-0 text-accent" />}
              </button>
            );
          })}
        </div>

        {settings.executionMode === 'full' && (
          <p className="mt-4 rounded-md border border-warning-line bg-warning-subtle px-3 py-2 text-xs text-warning">
            完全访问模式下，所有操作将直接执行，包括文件删除与代码执行。请确保你了解潜在风险。
          </p>
        )}
      </Card>

      {/* 外观 */}
      <Card padding="lg" className="mb-4">
        <CardHeader title="外观" description="切换浅色 / 深色主题" className="mb-3" />
        <Segmented
          block
          options={THEME_OPTIONS}
          value={settings.theme}
          onChange={(theme) => updateSettings({ theme })}
        />
      </Card>

      {/* 语言 */}
      <Card padding="lg" className="mb-4">
        <CardHeader title="语言" description="界面显示语言" className="mb-3" />
        <Segmented
          options={LANGUAGE_OPTIONS}
          value={settings.language}
          onChange={(language) => updateSettings({ language })}
        />
      </Card>

      {/* 应用设置 */}
      <Card padding="lg" className="mb-4">
        <CardHeader
          title="应用设置"
          description="点击应用以保存以上修改并写入本地数据库"
          className="mb-3"
        />
        <Button
          variant="primary"
          icon={<Save size={15} />}
          onClick={applySettings}
          disabled={saving}
          block
        >
          {saved ? '已保存' : saving ? '保存中…' : '应用'}
        </Button>
      </Card>

      {/* 关于 */}
      <Card padding="lg">
        <CardHeader title="关于" className="mb-3" />
        <dl className="space-y-2 text-sm">
          {ABOUT_ROWS.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4">
              <dt className="text-fg-secondary">{row.label}</dt>
              {row.href ? (
                <dd className="min-w-0">
                  <button
                    type="button"
                    onClick={() => openUrl(row.href)}
                    className="flex shrink-0 items-center gap-1.5 truncate text-accent transition-colors duration-150 hover:text-accent-hover"
                    title="在浏览器中打开"
                  >
                    <span className="truncate">{row.value}</span>
                    <ExternalLink size={13} className="shrink-0" />
                  </button>
                </dd>
              ) : (
                <dd className="truncate text-fg-muted">{row.value}</dd>
              )}
            </div>
          ))}
        </dl>
        <p className="mt-4 flex items-start gap-2 border-t border-line pt-3 text-xs text-fg-muted">
          <Info size={13} className="mt-0.5 shrink-0" />
          所有对话、记忆与配置默认只存储在本地，不会上传任何云端。
        </p>
      </Card>
    </Page>
  );
}
