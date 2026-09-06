import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Trash2, Settings, Power, PowerOff, Globe, Package } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { v4 as uuidv4 } from 'uuid';

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

export function PluginManager() {
  const { currentUser } = useAppStore();
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    plugin_type: 'tool',
    endpoint: '',
    method: 'GET',
    schema: '',
    auth_type: 'none',
    auth_value: '',
  });

  const loadPlugins = async () => {
    if (!currentUser) return;
    try {
      const result = await invoke<Plugin[]>('get_plugins', {
        userId: currentUser.id,
      });
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
      auth_config: formData.auth_type !== 'none'
        ? JSON.stringify({ type: formData.auth_type, value: formData.auth_value })
        : null,
      installed_at: new Date().toISOString(),
    };

    try {
      await invoke('add_plugin', { plugin });
      setShowAddModal(false);
      resetForm();
      loadPlugins();
    } catch (error) {
      console.error('添加插件失败:', error);
    }
  };

  const handleTogglePlugin = async (plugin: Plugin) => {
    try {
      await invoke('update_plugin', {
        id: plugin.id,
        enabled: !plugin.enabled,
      });
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

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      plugin_type: 'tool',
      endpoint: '',
      method: 'GET',
      schema: '',
      auth_type: 'none',
      auth_value: '',
    });
  };

  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  const authTypes = [
    { id: 'none', name: '无认证' },
    { id: 'apikey', name: 'API Key' },
    { id: 'bearer', name: 'Bearer Token' },
  ];

  return (
    <div className="flex-1 bg-gray-50 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">扩展管理</h1>
            <p className="text-sm text-gray-500 mt-1">管理你的工具插件</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus size={18} />
            <span>添加插件</span>
          </button>
        </div>

        {/* Plugins List */}
        {plugins.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <div className="text-5xl mb-4">🔌</div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">暂无插件</h3>
            <p className="text-gray-500 mb-4">添加 HTTP 远程工具来扩展功能</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              添加第一个插件
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {plugins.map((plugin) => (
              <div
                key={plugin.id}
                className={`bg-white rounded-xl border p-4 transition-all ${
                  plugin.enabled ? 'border-gray-200' : 'border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      plugin.plugin_type === 'tool'
                        ? 'bg-blue-100 text-blue-600'
                        : plugin.plugin_type === 'model'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-purple-100 text-purple-600'
                    }`}>
                      {plugin.plugin_type === 'tool' ? (
                        <Package size={20} />
                      ) : plugin.plugin_type === 'model' ? (
                        <Globe size={20} />
                      ) : (
                        <Settings size={20} />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800">{plugin.name}</h3>
                      {plugin.description && (
                        <p className="text-sm text-gray-500 mt-1">{plugin.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span>v{plugin.version}</span>
                        <span>{plugin.method} {plugin.endpoint}</span>
                        <span className={`px-2 py-0.5 rounded-full ${
                          plugin.enabled
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {plugin.enabled ? '已启用' : '已禁用'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTogglePlugin(plugin)}
                      className={`p-2 rounded-lg transition-colors ${
                        plugin.enabled
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                      title={plugin.enabled ? '禁用' : '启用'}
                    >
                      {plugin.enabled ? <Power size={18} /> : <PowerOff size={18} />}
                    </button>
                    <button
                      onClick={() => handleDeletePlugin(plugin.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="删除"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Plugin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">添加 HTTP 远程工具</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">工具名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例如: 获取用户列表"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="工具功能描述"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">端点 URL</label>
                <input
                  type="text"
                  value={formData.endpoint}
                  onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://api.example.com/users"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HTTP 方法</label>
                  <select
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {httpMethods.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">认证方式</label>
                  <select
                    value={formData.auth_type}
                    onChange={(e) => setFormData({ ...formData, auth_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {authTypes.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.auth_type !== 'none' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.auth_type === 'apikey' ? 'API Key' : 'Token'}
                  </label>
                  <input
                    type="password"
                    value={formData.auth_value}
                    onChange={(e) => setFormData({ ...formData, auth_value: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={formData.auth_type === 'apikey' ? 'sk-...' : 'Bearer token'}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">参数 Schema (JSON)</label>
                <textarea
                  value={formData.schema}
                  onChange={(e) => setFormData({ ...formData, schema: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows={4}
                  placeholder='{"type": "object", "properties": {"limit": {"type": "integer"}}}'
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddPlugin}
                disabled={!formData.name || !formData.endpoint}
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
