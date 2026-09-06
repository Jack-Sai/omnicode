import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Trash2, Search, Brain } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
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

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (hours < 1) return '刚刚';
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;
  return date.toLocaleDateString('zh-CN');
}

export function MemoryManager() {
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
        title="记忆系统"
        description="Agent 沉淀的长期知识与经验，可检索、可编辑。"
        actions={
          <Button
            variant="primary"
            icon={<Plus size={15} />}
            onClick={() => setShowAddModal(true)}
          >
            添加记忆
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
            placeholder="搜索记忆内容…"
          />
          <Button variant="secondary" onClick={handleSearch} className="shrink-0">
            搜索
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
          title="暂无记忆"
          description="把项目约定、偏好或踩过的坑写进记忆库，Agent 会自动检索使用。"
          action={
            <Button
              variant="primary"
              icon={<Plus size={15} />}
              onClick={() => setShowAddModal(true)}
            >
              添加第一条记忆
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
                  label="删除记忆"
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
                <span>重要性 {(memory.importance * 100).toFixed(0)}%</span>
                <span>访问 {memory.access_count} 次</span>
                <span>{formatDate(memory.created_at)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        title="添加记忆"
        description="写入后 Agent 可在后续任务中检索到这条内容。"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleAddMemory}
              disabled={!formData.content.trim()}
            >
              添加
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="内容">
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={4}
              placeholder="输入要记住的内容…"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="类型">
              <Select
                value={formData.memory_type}
                onChange={(e) => setFormData({ ...formData, memory_type: e.target.value })}
              >
                <option value="short">短期记忆</option>
                <option value="long">长期记忆</option>
                <option value="success">成功经验</option>
                <option value="failure">失败教训</option>
              </Select>
            </Field>

            <Field label={`重要性：${(formData.importance * 100).toFixed(0)}%`}>
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
