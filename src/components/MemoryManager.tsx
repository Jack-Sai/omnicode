import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Trash2, Search, Brain } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../i18n';
import { v4 as uuidv4 } from 'uuid';
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
  type BadgeTone,
} from './ui';

interface Memory {
  id: string;
  user_id: string;
  content: string;
  memory_type: string;
  importance: number;
  access_count: number;
  created_at: string;
  last_accessed: string | null;
  metadata: string | null;
}

const TYPE_TONE: Record<string, BadgeTone> = {
  short: 'accent',
  long: 'info',
  success: 'success',
  failure: 'danger',
};

const TYPE_LABEL: Record<string, string> = {
  short: '短期',
  long: '长期',
  success: '成功',
  failure: '失败',
};

const FILTERS = [
  { id: 'all', name: '全部' },
  { id: 'short', name: '短期' },
  { id: 'long', name: '长期' },
  { id: 'success', name: '成功' },
  { id: 'failure', name: '失败' },
];

const emptyForm = { content: '', memory_type: 'short', importance: 0.5 };

function formatDate(dateStr: string, t: (key: string) => string) {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (hours < 1) return t('memory.time.just_now');
  if (hours < 24) return `${hours} ${t('memory.time.hours_ago')}`;
  if (days < 7) return `${days} ${t('memory.time.days_ago')}`;
  return date.toLocaleDateString('zh-CN');
}

export function MemoryManager() {
  const { t } = useTranslation();
  const { currentUser } = useAppStore();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [formData, setFormData] = useState(emptyForm);

  const loadMemories = async () => {
    if (!currentUser) return;
    try {
      const result = await invoke<Memory[]>('get_memories', {
        userId: currentUser.id,
        memoryType: filterType === 'all' ? null : filterType,
        limit: 100,
      });
      setMemories(result);
    } catch (error) {
      console.error('加载记忆失败:', error);
    }
  };

  useEffect(() => {
    loadMemories();
  }, [currentUser, filterType]);

  const handleSearch = async () => {
    if (!currentUser) return;
    if (!searchQuery.trim()) {
      loadMemories();
      return;
    }
    try {
      const result = await invoke<Memory[]>('search_memories', {
        userId: currentUser.id,
        query: searchQuery,
        limit: 50,
      });
      setMemories(result);
    } catch (error) {
      console.error('搜索记忆失败:', error);
    }
  };

  const handleAddMemory = async () => {
    if (!currentUser || !formData.content.trim()) return;
    const memory: Memory = {
      id: uuidv4(),
      user_id: currentUser.id,
      content: formData.content.trim(),
      memory_type: formData.memory_type,
      importance: formData.importance,
      access_count: 0,
      created_at: new Date().toISOString(),
      last_accessed: null,
      metadata: null,
    };
    try {
      await invoke('add_memory', { memory });
      setShowAddModal(false);
      setFormData(emptyForm);
      loadMemories();
    } catch (error) {
      console.error('添加记忆失败:', error);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      await invoke('delete_memory', { id });
      loadMemories();
    } catch (error) {
      console.error('删除记忆失败:', error);
    }
  };

  return (
    <Page>
      <PageHeader
        title={t('memory.title')}
        description={t('memory.desc')}
        actions={
          <Button
            variant="primary"
            icon={<Plus size={15} />}
            onClick={() => setShowAddModal(true)}
          >
            {t('memory.add')}
          </Button>
        }
        className="mb-6"
      />

      {/* 搜索与筛选 */}
      <Card className="mb-4 space-y-3">
        <div className="flex items-center gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            leadingIcon={<Search size={14} />}
            placeholder={t('memory.search.placeholder')}
          />
          <Button variant="secondary" onClick={handleSearch} className="shrink-0">
            {t('memory.search')}
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((type) => {
            const active = filterType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => setFilterType(type.id)}
                className={
                  active
                    ? 'inline-flex h-7 items-center rounded-full border border-accent-line bg-accent-subtle px-3 text-xs font-medium text-accent transition-colors'
                    : 'inline-flex h-7 items-center rounded-full border border-line bg-surface px-3 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg-secondary'
                }
              >
                {type.name}
              </button>
            );
          })}
        </div>
      </Card>

      {memories.length === 0 ? (
        <EmptyState
          icon={<Brain size={20} />}
          title={t('memory.empty.title')}
          description={t('memory.empty.desc')}
          action={
            <Button
              variant="primary"
              icon={<Plus size={15} />}
              onClick={() => setShowAddModal(true)}
            >
              {t('memory.empty.action')}
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {memories.map((memory) => (
            <Card key={memory.id}>
              <div className="flex items-start gap-3">
                <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-fg">
                  {memory.content}
                </p>
                <IconButton
                  label={t('memory.delete')}
                  size="sm"
                  className="shrink-0 text-fg-muted hover:bg-danger-subtle hover:text-danger"
                  onClick={() => handleDeleteMemory(memory.id)}
                >
                  <Trash2 size={14} />
                </IconButton>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-fg-muted">
                <Badge tone={TYPE_TONE[memory.memory_type] || 'neutral'}>
                  {TYPE_LABEL[memory.memory_type] || memory.memory_type}
                </Badge>
                <span>{t('memory.importance')} {(memory.importance * 100).toFixed(0)}%</span>
                <span>{t('memory.visits')} {memory.access_count} {t('memory.visits.unit')}</span>
                <span>{formatDate(memory.created_at, t)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        title={t('memory.modal.title')}
        description={t('memory.modal.desc')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              {t('memory.modal.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleAddMemory}
              disabled={!formData.content.trim()}
            >
              {t('memory.modal.add')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={t('memory.field.content')}>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={4}
              placeholder={t('memory.field.content.placeholder')}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t('memory.field.type')}>
              <Select
                value={formData.memory_type}
                onChange={(e) => setFormData({ ...formData, memory_type: e.target.value })}
              >
                <option value="short">{t('memory.type.short')}</option>
                <option value="long">{t('memory.type.long')}</option>
                <option value="success">{t('memory.type.success')}</option>
                <option value="failure">{t('memory.type.failure')}</option>
              </Select>
            </Field>

            <Field label={`${t('memory.importance')}：${(formData.importance * 100).toFixed(0)}%`}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={formData.importance}
                onChange={(e) =>
                  setFormData({ ...formData, importance: parseFloat(e.target.value) })
                }
                className="mt-2.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-inset accent-accent"
              />
            </Field>
          </div>
        </div>
      </Modal>
    </Page>
  );
}
