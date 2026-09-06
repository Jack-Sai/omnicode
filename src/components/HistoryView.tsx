import { useAppStore } from '../store/useAppStore';
import { Clock, MessageSquare, Trash2 } from 'lucide-react';

export function HistoryView() {
  const { conversations, setCurrentConversation, removeConversation, messages } = useAppStore();

  const sortedConversations = [...conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days} 天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  const getMessageCount = (conversationId: string) => {
    return messages[conversationId]?.length || 0;
  };

  return (
    <div className="flex-1 bg-gray-50 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">历史记录</h1>
          <p className="text-sm text-gray-500 mt-1">查看你的所有对话记录</p>
        </div>

        {sortedConversations.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
            <div className="text-5xl mb-4">📜</div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">暂无历史记录</h3>
            <p className="text-gray-500">开始对话后会在这里显示</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedConversations.map((conversation) => (
              <div
                key={conversation.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setCurrentConversation(conversation.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare size={16} className="text-blue-500" />
                      <h3 className="font-medium text-gray-800 truncate">{conversation.title}</h3>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {formatDate(conversation.updatedAt)}
                      </span>
                      <span>{getMessageCount(conversation.id)} 条消息</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeConversation(conversation.id);
                    }}
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
    </div>
  );
}
