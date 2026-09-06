import { useState } from 'react';
import { Plus, Trash2, Check, Wifi, Settings2, Cpu, Cloud, HardDrive } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
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
  StatusDot,
  type DotTone,
} from './ui';
import type { Model } from '../types';

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', endpoint: 'https://api.openai.com/v1/chat/completions' },
  { id: 'anthropic', name: 'Anthropic', endpoint: 'https://api.anthropic.com/v1/messages' },
  { id: 'deepseek', name: 'DeepSeek', endpoint: 'https://api.deepseek.com/v1/chat/completions' },
  { id: 'moonshot', name: '月之暗面', endpoint: 'https://api.moonshot.cn/v1/chat/completions' },
  { id: 'ollama', name: 'Ollama（本地）', endpoint: 'http://localhost:11434/api/chat' },
  { id: 'custom', name: '自定义', endpoint: '' },
];

const STATUS_DOT: Record<Model['status'], DotTone> = {
  online: 'success',
  checking: 'warning',
  offline: 'muted',
};

const emptyForm = {
  name: '',
  provider: 'openai',
  endpoint: PROVIDERS[0].endpoint,
  apiKey: '',
  modelIdentifier: '',
  contextLength: 4096,
  temperature: 0.7,
  sourceType: 'api' as 'api' | 'local',
};

export function ModelLibrary() {
  const { models, currentModelId, addModel, updateModel, removeModel, setCurrentModel } =
    useAppStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const openCreate = () => {
    setEditingModel(null);
    setFormData(emptyForm);
    setShowAddModal(true);
  };

  const openEdit = (model: Model) => {
    setEditingModel(model);
    setFormData({
      name: model.name,
      provider: model.provider,
      endpoint: model.endpoint,
      apiKey: model.apiKey || '',
      modelIdentifier: model.modelIdentifier,
      contextLength: model.contextLength,
      temperature: model.temperature,
      sourceType: model.sourceType,
    });
    setShowAddModal(true);
  };

  const handleProviderChange = (providerId: string) => {
    const provider = PROVIDERS.find((p) => p.id === providerId);
    setFormData({
      ...formData,
      provider: providerId,
      endpoint: provider?.endpoint || '',
      sourceType: providerId === 'ollama' ? 'local' : 'api',
    });
  };

  const handleSubmit = () => {
    const model: Model = {
      id: editingModel?.id || uuidv4(),
      name: formData.name,
      provider: formData.provider,
      endpoint: formData.endpoint,
      apiKey: formData.apiKey,
      modelIdentifier: formData.modelIdentifier,
      contextLength: formData.contextLength,
      temperature: formData.temperature,
      isDefault: models.length === 0,
      status: 'offline',
      sourceType: formData.sourceType,
    };
    if (editingModel) {
      updateModel(editingModel.id, model);
    } else {
      addModel(model);
    }
    setShowAddModal(false);
    setEditingModel(null);
  };

  const testConnection = (model: Model) => {
    updateModel(model.id, { status: 'checking' });
    setTimeout(() => {
      updateModel(model.id, { status: Math.random() > 0.3 ? 'online' : 'offline' });
    }, 1000);
  };

  return (
    <Page>
      <PageHeader
        title="模型库"
        description="管理云端 API 与本地部署的推理后端，随时切换。"
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={openCreate}>
            添加模型
          </Button>
        }
        className="mb-6"
      />

      {models.length === 0 ? (
        <EmptyState
          icon={<Cpu size={20} />}
          title="还没有添加模型"
          description="添加一个云端 API 或本地推理服务后即可开始对话。"
          action={
            <Button variant="primary" icon={<Plus size={15} />} onClick={openCreate}>
              添加第一个模型
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {models.map((model) => {
            const active = currentModelId === model.id;
            const isLocal = model.sourceType === 'local';
            return (
              <Card key={model.id} selected={active} className="flex flex-col">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border',
                      isLocal
                        ? 'border-success-line bg-success-subtle text-success'
                        : 'border-accent-line bg-accent-subtle text-accent'
                    )}
                  >
                    {isLocal ? <HardDrive size={16} /> : <Cloud size={16} />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-fg">{model.name}</h3>
                      <StatusDot tone={STATUS_DOT[model.status]} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-fg-muted">
                      {PROVIDERS.find((p) => p.id === model.provider)?.name || model.provider}
                    </p>
                  </div>

                  <Badge tone={isLocal ? 'success' : 'accent'}>
                    {isLocal ? '本地' : '云端'}
                  </Badge>
                </div>

                <dl className="mt-4 space-y-1 text-xs text-fg-muted">
                  <div className="flex gap-2">
                    <dt className="shrink-0">端点</dt>
                    <dd className="truncate font-mono text-fg-secondary" title={model.endpoint}>
                      {model.endpoint}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="shrink-0">上下文</dt>
                    <dd className="text-fg-secondary">{model.contextLength.toLocaleString()}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="shrink-0">温度</dt>
                    <dd className="text-fg-secondary">{model.temperature}</dd>
                  </div>
                </dl>

                <div className="mt-4 flex items-center gap-1.5 border-t border-line pt-3">
                  <Button
                    variant={active ? 'primary' : 'secondary'}
                    size="sm"
                    icon={active ? <Check size={13} /> : undefined}
                    onClick={() => setCurrentModel(model.id)}
                    className={cn(!active && 'text-fg-secondary')}
                  >
                    {active ? '当前使用' : '使用此模型'}
                  </Button>
                  <div className="flex-1" />
                  <IconButton label="测试连接" size="sm" onClick={() => testConnection(model)}>
                    <Wifi size={14} />
                  </IconButton>
                  <IconButton label="编辑" size="sm" onClick={() => openEdit(model)}>
                    <Settings2 size={14} />
                  </IconButton>
                  <IconButton
                    label="删除"
                    size="sm"
                    className="text-fg-muted hover:bg-danger-subtle hover:text-danger"
                    onClick={() => removeModel(model.id)}
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        title={editingModel ? '编辑模型' : '添加模型'}
        description="填写推理服务信息，API Key 会加密存储在本地。"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!formData.name || !formData.endpoint}
            >
              {editingModel ? '保存' : '添加'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="模型名称">
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例如：GPT-4"
            />
          </Field>

          <Field label="服务商">
            <Select
              value={formData.provider}
              onChange={(e) => handleProviderChange(e.target.value)}
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="端点 URL">
            <Input
              value={formData.endpoint}
              onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
              placeholder="https://api.openai.com/v1/chat/completions"
            />
          </Field>

          {formData.sourceType === 'api' && (
            <Field label="API Key" hint="仅保存在本地，不会上传。">
              <Input
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder="sk-…"
              />
            </Field>
          )}

          <Field label="模型标识">
            <Input
              value={formData.modelIdentifier}
              onChange={(e) => setFormData({ ...formData, modelIdentifier: e.target.value })}
              placeholder="例如：gpt-4、claude-3-opus"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="上下文窗口">
              <Input
                type="number"
                value={formData.contextLength}
                onChange={(e) =>
                  setFormData({ ...formData, contextLength: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="温度">
              <Input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={formData.temperature}
                onChange={(e) =>
                  setFormData({ ...formData, temperature: Number(e.target.value) })
                }
              />
            </Field>
          </div>
        </div>
      </Modal>
    </Page>
  );
}
