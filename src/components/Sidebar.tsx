import { MessageSquare, History, Cpu, Settings, Plus, ChevronLeft, ChevronRight, Package, Brain } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { v4 as uuidv4 } from 'uuid';
import type { Conversation } from '../types';

type Page = 'chat' | 'models' | 'history' | 'settings' | 'plugins' | 'memory';

interface SidebarProps {
  onNavigate: (page: Page) => void;
  currentPage: Page;
}

export function Sidebar({ onNavigate, currentPage }: SidebarProps) {
  const {
    conversations,
    currentConversationId,
    setCurrentConversation,
    addConversation,
    sidebarCollapsed,
    toggleSidebar,
  } = useAppStore();

  const handleNewConversation = () => {
    const newConversation: Conversation = {
      id: uuidv4(),
      title: '新对话',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addConversation(newConversation);
    onNavigate('chat');
  };

  const menuItems: { id: Page; icon: React.ReactNode; label: string }[] = [
    { id: 'chat', icon: <MessageSquare size={18} />, label: '对话' },
    { id: 'models', icon: <Cpu size={18} />, label: '模型库' },
    { id: 'memory', icon: <Brain size={18} />, label: '记忆' },
    { id: 'plugins', icon: <Package size={18} />, label: '扩展' },
    { id: 'history', icon: <History size={18} />, label: '历史' },
  ];

  return (
    <div
      className={`flex flex-col border-r border-gray-200 bg-gray-50 transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!sidebarCollapsed && <span className="font-semibold text-gray-800">Omni Code</span>}
        <button
          onClick={toggleSidebar}
          className="p-1 rounded hover:bg-gray-200 transition-colors"
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* New Conversation Button */}
      {!sidebarCollapsed && (
        <button
          onClick={handleNewConversation}
          className="flex items-center gap-2 m-3 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus size={16} />
          <span>新对话</span>
        </button>
      )}

      {/* Navigation Menu */}
      <div className="px-3 py-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1 ${
              currentPage === item.id
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {item.icon}
            {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
          </button>
        ))}
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-3">
        {!sidebarCollapsed && (
          <div className="text-xs font-medium text-gray-500 px-3 py-2">对话列表</div>
        )}
        {conversations.slice(0, 10).map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => {
              setCurrentConversation(conversation.id);
              onNavigate('chat');
            }}
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors mb-1 ${
              currentConversationId === conversation.id
                ? 'bg-gray-100 text-gray-800'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {sidebarCollapsed ? (
              <MessageSquare size={16} className="mx-auto" />
            ) : (
              <div className="text-sm truncate">{conversation.title}</div>
            )}
          </button>
        ))}
      </div>

      {/* Bottom Settings */}
      <div className="border-t border-gray-200 p-3">
        <button
          onClick={() => onNavigate('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
            currentPage === 'settings'
              ? 'bg-blue-100 text-blue-600'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Settings size={18} />
          {!sidebarCollapsed && <span className="text-sm font-medium">设置</span>}
        </button>
      </div>
    </div>
  );
}
