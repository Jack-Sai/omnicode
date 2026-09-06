import { useState } from 'react';
import { Plus, Trash2, Check, Wifi, WifiOff, Settings2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { v4 as uuidv4 } from 'uuid';
import type { Model } from '../types';

export function ModelLibrary() {
  const { models, currentModelId, addModel, updateModel, removeModel, setCurrentModel } = useAppStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    provider: 'openai',
    endpoint: '',
    apiKey: '',
    modelIdentifier: '',
    contextLength: 4096,
    temperature: 0.7,
    sourceType: 'api' as 'api' | 'local',
  });

  const providers = [
    { id: 'openai', name: 'OpenAI', endpoint: 'https://api.openai.com/v1/chat/completions' },
    { id: 'anthropic', name: 'Anthropic', endpoint: 'https://api.anthropic.com/v1/messages' },
    { id: 'deepseek', name: 'DeepSeek', endpoint: 'https://api.deepseek.com/v1/chat/completions' },
    { id: 'moonshot', name: '月之暗面', endpoint: 'https://api.moonshot.cn/v1/chat/completions' },
    { id: 'ollama', name: 'Ollama (本地)', endpoint: 'http://localhost:11434/api/chat' },
    { id: 'custom', name: '自定义', endpoint: '' },
  ];

  const handleProviderChange = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    setFormData({
      ...formData,
      provider: providerId,
      endpoint: provider?.endpoint || '',
      sourceType: providerId.startsWith('ollama') ? 'local' : 'api',
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
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      provider: 'openai',
      endpoint: '',
      apiKey: '',
      modelIdentifier: '',
      contextLength: 4096,
      temperature: 0.7,
      sourceType: 'api',
    });
  };

  const handleEdit = (model: Model) => {
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

  const testConnection = async (model: Model) => {
    updateModel(model.id, { status: 'checking' });
    // TODO: Implement actual connection test
    setTimeout(() => {
      updateModel(model.id, { status: Math.random() > 0.3 ? 'online' : 'offline' });
    }, 1000);
  };

  return (
    <div className="flex-1 bg-gray-50 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">模型库</h1>
            <p className="text-sm text-gray-500 mt-1">管理你的 AI 模型配置</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setEditingModel(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus size={18} />
            <span>添加模型</span>
          </button>
        </div>

        {/* Models Grid */}
        {models.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <div className="text-5xl mb-4">🤖</div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">还没有添加模型</h3>
            <p className="text-gray-500 mb-4">添加一个模型来开始使用</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              添加第一个模型
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {models.map((model) => (
              <div
                key={model.id}
                className={`bg-white rounded-xl border-2 p-4 transition-all ${
                  currentModelId === model.id
                    ? 'border-blue-500 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        model.sourceType === 'local' ? 'bg-green-100' : 'bg-blue-100'
                      }`}
                    >
                      {model.sourceType === 'local' ? (
                        <Wifi size={20} className="text-green-600" />
                      ) : (
                        <WifiOff size={20} className="text-blue-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800">{model.name}</h3>
                      <p className="text-xs text-gray-500">
                        {providers.find((p) => p.id === model.provider)?.name || model.provider}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {model.status === 'online' && (
                      <span className="w-2 h-2 bg-green-500 rounded-full" />
                    )}
                    {model.status === 'checking' && (
                      <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                    )}
                  </div>
                </div>

                <div className="text-sm text-gray-600 mb-3 space-y-1">
                  <p className="truncate">端点: {model.endpoint}</p>
                  <p>上下文窗口: {model.contextLength.toLocaleString()}</p>
                  <p>温度: {model.temperature}</p>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => setCurrentModel(model.id)}
                    className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                      currentModelId === model.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {currentModelId === model.id ? (
                      <span className="flex items-center justify-center gap-1">
                        <Check size={14} /> 当前使用
                      </span>
                    ) : (
                      '使用此模型'
                    )}
                  </button>
                  <button
                    onClick={() => testConnection(model)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="测试连接"
                  >
                    <Wifi size={16} />
                  </button>
                  <button
                    onClick={() => handleEdit(model)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="编辑"
                  >
                    <Settings2 size={16} />
                  </button>
                  <button
                    onClick={() => removeModel(model.id)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    title="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {editingModel ? '编辑模型' : '添加模型'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模型名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例如: GPT-4"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">服务商</label>
                <select
                  value={formData.provider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">端点 URL</label>
                <input
                  type="text"
                  value={formData.endpoint}
                  onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://api.openai.com/v1/chat/completions"
                />
              </div>

              {formData.sourceType === 'api' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                  <input
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="sk-..."
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模型标识</label>
                <input
                  type="text"
                  value={formData.modelIdentifier}
                  onChange={(e) => setFormData({ ...formData, modelIdentifier: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例如: gpt-4, claude-3-opus"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">上下文窗口</label>
                  <input
                    type="number"
                    value={formData.contextLength}
                    onChange={(e) => setFormData({ ...formData, contextLength: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">温度</label>
                  <input
                    type="number"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.1"
                    min="0"
                    max="2"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingModel(null);
                }}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.name || !formData.endpoint}
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editingModel ? '保存' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
