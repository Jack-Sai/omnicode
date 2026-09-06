import { useAppStore } from '../store/useAppStore';
import { Clock, MessageSquare, Trash2, History } from 'lucide-react';
import { Card, EmptyState, IconButton, Page, PageHeader } from './ui';

export function HistoryView() {
  const { conversations, setCurrentConversation, removeConversation, messages } = useAppStore();

  const sortedConversations = [...conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return '昨天';
    if (days < 7) return `${days} 天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const getMessageCount = (conversationId: string) => messages[conversationId]?.length || 0;

  return (
    <Page>
      <PageHeader
        title="历史记录"
        description="所有对话按最近更新排序，点击即可继续。"
        className="mb-6"
      />

      {sortedConversations.length === 0 ? (
        <EmptyState
          icon={<History size={20} />}
          title="暂无历史记录"
          description="开始一段对话后，记录会出现在这里。"
        />
      ) : (
        <div className="space-y-2">
          {sortedConversations.map((conversation) => (
            <Card
              key={conversation.id}
              interactive
              className="flex items-center gap-3"
              onClick={() => setCurrentConversation(conversation.id)}
            >
              <MessageSquare size={15} className="shrink-0 text-fg-muted" />

              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-medium text-fg">{conversation.title}</h3>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-fg-muted">
                  <span className="inline-flex items-center gap-1">
                    <Clock size={11} />
                    {formatDate(conversation.updatedAt)}
                  </span>
                  <span>{getMessageCount(conversation.id)} 条消息</span>
                </div>
              </div>

              <IconButton
                label="删除对话"
                size="sm"
                className="shrink-0 text-fg-muted hover:bg-danger-subtle hover:text-danger"
                onClick={(e) => {
                  e.stopPropagation();
                  removeConversation(conversation.id);
                }}
              >
                <Trash2 size={14} />
              </IconButton>
            </Card>
          ))}
        </div>
      )}
    </Page>
  );
}
