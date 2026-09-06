import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Trash2, Search, Brain, Clock, Star } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { v4 as uuidv4 } from 'uuid';

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

export function MemoryManager() {
  const { currentUser } = useAppStore();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const [formData, setFormData] = useState({
    content: '',
    memory_type: 'short',
    importance: 0.5,
  });

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
    if (!currentUser || !searchQuery.trim()) {
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
      setFormData({ content: '', memory_type: 'short', importance: 0.5 });
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

  const memoryTypes = [
    { id: 'all', name: '全部', icon: <Brain size={16} /> },
    { id: 'short', name: '短期记忆', icon: <Clock size={16} /> },
    { id: 'long', name: '长期记忆', icon: <Star size={16} /> },
    { id: 'success', name: '成功经验', icon: <span className="text-green-500">✓</span> },
    { id: 'failure', name: '失败教训', icon: <span className="text-red-500">✗</span> },
  ];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return '刚刚';
    if (hours < 24) return `${hours} 小时前`;
    if (days < 7) return `${days} 天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="flex-1 bg-gray-50 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">记忆系统</h1>
            <p className="text-sm text-gray-500 mt-1">管理和检索你的知识库</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus size={18} />
            <span>添加记忆</span>
          </button>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="搜索记忆..."
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              搜索
            </button>
          </div>

          {/* Type Filter */}
          <div className="flex gap-2 mt-3">
            {memoryTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setFilterType(type.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  filterType === type.id
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type.icon}
                {type.name}
              </button>
            ))}
          </div>
        </div>

        {/* Memories List */}
        {memories.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <div className="text-5xl mb-4">🧠</div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">暂无记忆</h3>
            <p className="text-gray-500 mb-4">添加重要信息到记忆库</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              添加第一条记忆
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {memories.map((memory) => (
              <div
                key={memory.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-gray-800 whitespace-pre-wrap">{memory.content}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span className={`px-2 py-0.5 rounded-full ${
                        memory.memory_type === 'short'
                          ? 'bg-blue-100 text-blue-600'
                          : memory.memory_type === 'long'
                          ? 'bg-purple-100 text-purple-600'
                          : memory.memory_type === 'success'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {memory.memory_type === 'short'
                          ? '短期'
                          : memory.memory_type === 'long'
                          ? '长期'
                          : memory.memory_type === 'success'
                          ? '成功'
                          : '失败'}
                      </span>
                      <span>重要性: {(memory.importance * 100).toFixed(0)}%</span>
                      <span>访问 {memory.access_count} 次</span>
                      <span>{formatDate(memory.created_at)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteMemory(memory.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Memory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">添加记忆</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="输入要记住的内容..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                  <select
                    value={formData.memory_type}
                    onChange={(e) => setFormData({ ...formData, memory_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="short">短期记忆</option>
                    <option value="long">长期记忆</option>
                    <option value="success">成功经验</option>
                    <option value="failure">失败教训</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    重要性: {(formData.importance * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.importance}
                    onChange={(e) => setFormData({ ...formData, importance: parseFloat(e.target.value) })}
                    className="w-full mt-2"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddMemory}
                disabled={!formData.content.trim()}
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
