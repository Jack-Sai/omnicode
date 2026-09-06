import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Trash2, Power, PowerOff, Globe, Package } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../i18n';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '../lib/cn';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  IconButton,
  Input,
  Modal,
  Page,
  PageHeader,
  Select,
  Textarea,
} from './ui';

interface Plugin {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  plugin_type: string;
  version: string;
  enabled: boolean;
  config: string | null;
  endpoint: string | null;
  method: string | null;
  schema: string | null;
  auth_config: string | null;
  installed_at: string;
}

const TYPE_STYLE: Record<string, string> = {
  tool: 'border-accent-line bg-accent-subtle text-accent',
  model: 'border-success-line bg-success-subtle text-success',
  service: 'border-info-line bg-info-subtle text-info',
};

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

const AUTH_TYPES = [
  { id: 'none', name: '无认证' },
  { id: 'apikey', name: 'API Key' },
  { id: 'bearer', name: 'Bearer Token' },
];

const emptyForm = {
  name: '',
  description: '',
  plugin_type: 'tool',
  endpoint: '',
  method: 'GET',
  schema: '',
  auth_type: 'none',
  auth_value: '',
};

export function PluginManager() {
  const { t } = useTranslation();
  const { currentUser } = useAppStore();
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  const loadPlugins = async () => {
    if (!currentUser) return;
    try {
      const result = await invoke<Plugin[]>('get_plugins', { userId: currentUser.id });
      setPlugins(result);
    } catch (error) {
      console.error('加载插件失败:', error);
    }
  };

  useEffect(() => {
    loadPlugins();
  }, [currentUser]);

  const handleAddPlugin = async () => {
    if (!currentUser || !formData.name || !formData.endpoint) return;
    const plugin: Plugin = {
      id: uuidv4(),
      user_id: currentUser.id,
      name: formData.name,
      description: formData.description || null,
      plugin_type: formData.plugin_type,
      version: '1.0.0',
      enabled: true,
      config: null,
      endpoint: formData.endpoint,
      method: formData.method,
      schema: formData.schema || null,
      auth_config:
        formData.auth_type !== 'none'
          ? JSON.stringify({ type: formData.auth_type, value: formData.auth_value })
          : null,
      installed_at: new Date().toISOString(),
    };
    try {
      await invoke('add_plugin', { plugin });
      setShowAddModal(false);
      setFormData(emptyForm);
      loadPlugins();
    } catch (error) {
      console.error('添加插件失败:', error);
    }
  };

  const handleTogglePlugin = async (plugin: Plugin) => {
    try {
      await invoke('update_plugin', { id: plugin.id, enabled: !plugin.enabled });
      loadPlugins();
    } catch (error) {
      console.error('更新插件失败:', error);
    }
  };

  const handleDeletePlugin = async (id: string) => {
    try {
      await invoke('delete_plugin', { id });
      loadPlugins();
    } catch (error) {
      console.error('删除插件失败:', error);
    }
  };

  return (
    <Page>
      <PageHeader
        title={t('plugins.title')}
        description={t('plugins.desc')}
        actions={
          <Button
            variant="primary"
            icon={<Plus size={15} />}
            onClick={() => {
              setFormData(emptyForm);
              setShowAddModal(true);
            }}
          >
            {t('plugins.add')}
          </Button>
        }
        className="mb-6"
      />

      {plugins.length === 0 ? (
        <EmptyState
          icon={<Package size={20} />}
          title={t('plugins.empty.title')}
          description={t('plugins.empty.desc')}
          action={
            <Button
              variant="primary"
              icon={<Plus size={15} />}
              onClick={() => setShowAddModal(true)}
            >
              {t('plugins.empty.action')}
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {plugins.map((plugin) => (
            <Card
              key={plugin.id}
              className={cn('flex items-start gap-3', !plugin.enabled && 'opacity-60')}
            >
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border',
                  TYPE_STYLE[plugin.plugin_type] || TYPE_STYLE.tool
                )}
              >
                {plugin.plugin_type === 'model' ? <Globe size={16} /> : <Package size={16} />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-semibold text-fg">{plugin.name}</h3>
                  {plugin.description && (
                    <span className="truncate text-xs text-fg-muted">{plugin.description}</span>
                  )}
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[11px] text-fg-muted">
                  <span>v{plugin.version}</span>
                  <span className="rounded-sm bg-inset px-1.5 py-0.5 text-fg-secondary">
                    {plugin.method}
                  </span>
                  <span className="truncate">{plugin.endpoint}</span>
                </div>

                <div className="mt-2">
                  <Badge tone={plugin.enabled ? 'success' : 'neutral'}>
                    {plugin.enabled ? t('plugins.enabled') : t('plugins.disabled')}
                  </Badge>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <IconButton
                  label={plugin.enabled ? t('plugins.disable') : t('plugins.enable')}
                  size="sm"
                  className={cn(
                    plugin.enabled
                      ? 'text-success hover:bg-success-subtle'
                      : 'text-fg-muted hover:bg-surface-hover'
                  )}
                  onClick={() => handleTogglePlugin(plugin)}
                >
                  {plugin.enabled ? <Power size={15} /> : <PowerOff size={15} />}
                </IconButton>
                <IconButton
                  label={t('plugins.delete')}
                  size="sm"
                  className="text-fg-muted hover:bg-danger-subtle hover:text-danger"
                  onClick={() => handleDeletePlugin(plugin.id)}
                >
                  <Trash2 size={15} />
                </IconButton>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        title={t('plugins.modal.title')}
        description={t('plugins.modal.desc')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              {t('plugins.modal.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleAddPlugin}
              disabled={!formData.name || !formData.endpoint}
            >
              {t('plugins.modal.add')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={t('plugins.field.name')}>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('plugins.field.name.placeholder')}
            />
          </Field>

          <Field label={t('plugins.field.desc')}>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              placeholder={t('plugins.field.desc.placeholder')}
            />
          </Field>

          <Field label={t('plugins.field.endpoint')}>
            <Input
              value={formData.endpoint}
              onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
              placeholder="https://api.example.com/users"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t('plugins.field.method')}>
              <Select
                value={formData.method}
                onChange={(e) => setFormData({ ...formData, method: e.target.value })}
              >
                {HTTP_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={t('plugins.field.auth')}>
              <Select
                value={formData.auth_type}
                onChange={(e) => setFormData({ ...formData, auth_type: e.target.value })}
              >
                {AUTH_TYPES.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {formData.auth_type !== 'none' && (
            <Field label={formData.auth_type === 'apikey' ? 'API Key' : 'Token'}>
              <Input
                type="password"
                value={formData.auth_value}
                onChange={(e) => setFormData({ ...formData, auth_value: e.target.value })}
                placeholder={formData.auth_type === 'apikey' ? 'sk-…' : 'Bearer token'}
              />
            </Field>
          )}

          <Field label={t('plugins.field.schema')}>
            <Textarea
              mono
              value={formData.schema}
              onChange={(e) => setFormData({ ...formData, schema: e.target.value })}
              rows={4}
              placeholder='{"type": "object", "properties": {"limit": {"type": "integer"}}}'
            />
          </Field>
        </div>
      </Modal>
    </Page>
  );
}
