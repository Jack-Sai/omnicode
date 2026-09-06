import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { Moon, Sun, Monitor, Shield, Zap, Eye, LogOut, User, Check, Info, ExternalLink, Save } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button, Card, CardHeader, Modal, Page, PageHeader, Segmented, type SegmentedOption } from './ui';
import type { ExecutionMode } from '../types';
import { useTranslation } from '../i18n';

const EXECUTION_MODES: {
  id: ExecutionMode;
  nameKey: string;
  descKey: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'manual',
    nameKey: 'settings.execution.manual',
    descKey: 'settings.execution.manual.desc',
    icon: <Shield size={16} />,
  },
  {
    id: 'auto',
    nameKey: 'settings.execution.auto',
    descKey: 'settings.execution.auto.desc',
    icon: <Eye size={16} />,
  },
  {
    id: 'full',
    nameKey: 'settings.execution.full',
    descKey: 'settings.execution.full.desc',
    icon: <Zap size={16} />,
  },
];

const LANGUAGE_OPTIONS: SegmentedOption<'zh' | 'en'>[] = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
];

const ABOUT_ROWS = [
  { labelKey: 'settings.about.product', value: 'Omni Code' },
  { labelKey: 'settings.about.version', value: '0.1.0' },
  { labelKey: 'settings.about.author', value: 'Jack', href: 'https://github.com/Jack-Sai' },
  { labelKey: 'settings.about.github', value: 'github.com/Jack-Sai/omnicode', href: 'https://github.com/Jack-Sai/omnicode' },
];

export function SettingsView() {
  const { t } = useTranslation();
  const { settings, updateSettings, currentUser, logout } = useAppStore();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showFullAccessConfirm, setShowFullAccessConfirm] = useState(false);

  const THEME_OPTIONS: SegmentedOption<'light' | 'dark' | 'system'>[] = [
    { value: 'light', label: t('theme.light'), icon: <Sun size={14} /> },
    { value: 'dark', label: t('theme.dark'), icon: <Moon size={14} /> },
    { value: 'system', label: t('theme.system'), icon: <Monitor size={14} /> },
  ];

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
      <PageHeader title={t('settings.title')} description={t('settings.desc')} className="mb-6" />

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
              {t('settings.logout')}
            </Button>
          </div>
        </Card>
      )}

      {/* 执行模式 */}
      <Card padding="lg" className="mb-4">
        <CardHeader
          title={t('settings.execution.title')}
          description={t('settings.execution.desc')}
          className="mb-4"
        />
        <div className="space-y-2">
          {EXECUTION_MODES.map((mode) => {
            const active = settings.executionMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  if (mode.id === 'full' && settings.executionMode !== 'full') {
                    setShowFullAccessConfirm(true);
                  } else {
                    updateSettings({ executionMode: mode.id });
                  }
                }}
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
                  <span className="block text-sm font-medium text-fg">{t(mode.nameKey)}</span>
                  <span className="block text-xs text-fg-muted">{t(mode.descKey)}</span>
                </span>
                {active && <Check size={16} className="shrink-0 text-accent" />}
              </button>
            );
          })}
        </div>

        {settings.executionMode === 'full' && (
          <p className="mt-4 rounded-md border border-warning-line bg-warning-subtle px-3 py-2 text-xs text-warning">
            {t('settings.execution.full.warning')}
          </p>
        )}
      </Card>

      {/* 外观 & 语言 */}
      <Card padding="lg" className="mb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-fg">{t('settings.language')}</h3>
            <p className="mt-0.5 text-xs text-fg-muted">{t('settings.language.desc')}</p>
            <div className="mt-2">
              <Segmented
                options={LANGUAGE_OPTIONS}
                value={settings.language}
                onChange={(language) => updateSettings({ language })}
              />
            </div>
          </div>
          <div className="h-px w-full bg-line sm:h-auto sm:w-px sm:self-stretch" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-fg">{t('settings.appearance')}</h3>
            <p className="mt-0.5 text-xs text-fg-muted">{t('settings.appearance.desc')}</p>
            <div className="mt-2">
              <Segmented
                block
                options={THEME_OPTIONS}
                value={settings.theme}
                onChange={(theme) => updateSettings({ theme })}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* 应用设置 */}
      <Card padding="lg" className="mb-4">
        <CardHeader
          title={t('settings.save.title')}
          description={t('settings.save.desc')}
          className="mb-3"
        />
        <Button
          variant="primary"
          icon={<Save size={15} />}
          onClick={applySettings}
          disabled={saving}
          block
        >
          {saved ? t('settings.save.saved') : saving ? t('settings.save.saving') : t('settings.save.action')}
        </Button>
      </Card>

      {/* 关于 */}
      <Card padding="lg">
        <CardHeader title={t('settings.about.title')} className="mb-3" />
        <dl className="space-y-2 text-sm">
          {ABOUT_ROWS.map((row) => (
            <div key={row.labelKey} className="flex items-center justify-between gap-4">
              <dt className="text-fg-secondary">{t(row.labelKey)}</dt>
              {row.href ? (
                <dd className="min-w-0">
                  <button
                    type="button"
                    onClick={() => openUrl(row.href)}
                    className="flex shrink-0 items-center gap-1.5 truncate text-accent transition-colors duration-150 hover:text-accent-hover"
                    title={t('settings.about.open')}
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
          {t('settings.about.privacy')}
        </p>
      </Card>

      <Modal
        open={showFullAccessConfirm}
        onOpenChange={setShowFullAccessConfirm}
        title={t('settings.full_access.title')}
        description={t('settings.full_access.desc')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowFullAccessConfirm(false)}>
              {t('settings.full_access.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                updateSettings({ executionMode: 'full' });
                setShowFullAccessConfirm(false);
              }}
            >
              {t('settings.full_access.confirm')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-warning">
          {t('settings.full_access.warning')}
        </p>
      </Modal>
    </Page>
  );
}
