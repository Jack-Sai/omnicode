import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Square, MessageSquare, Sparkles, AlertTriangle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useAppStore } from '../store/useAppStore';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '../lib/cn';
import { Badge, Button, EmptyState, Select, Segmented, Textarea } from './ui';
import type { Message } from '../types';
import type { ChatMode } from '../types';

interface StreamEvent {
  event_type: string;
  content: string | null;
  finish_reason: string | null;
}

export function ChatView() {
  const {
    currentConversationId,
    conversations,
    messages,
    addMessage,
    updateMessage,
    addConversation,
    pendingConversationId,
    models,
    currentModelId,
    settings,
    updateSettings,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const currentMessages = currentConversationId ? messages[currentConversationId] || [] : [];
  const currentModel = models.find((m) => m.id === currentModelId);
  const currentConversation = conversations.find((c) => c.id === currentConversationId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  useEffect(() => {
    const unlisten = listen<StreamEvent>('chat-stream-chunk', (event) => {
      const { event_type, content } = event.payload;
      if (event_type === 'content' && streamingMessageId && currentConversationId) {
        const currentMsg = messages[currentConversationId]?.find(
          (m) => m.id === streamingMessageId
        );
        if (currentMsg) {
          updateMessage(currentConversationId, streamingMessageId, {
            content: currentMsg.content + (content || ''),
          });
        }
      } else if (event_type === 'done') {
        setIsLoading(false);
        setStreamingMessageId(null);
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [streamingMessageId, currentConversationId, messages, updateMessage]);

  const handleSubmit = async () => {
    if (!input.trim() || !currentConversationId || !currentModel) return;

    const isFirstMessage = pendingConversationId === currentConversationId;
    if (isFirstMessage) {
      const conversation = {
        id: currentConversationId,
        title: input.trim().slice(0, 30),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addConversation(conversation);
    } else {
      const conv = conversations.find((c) => c.id === currentConversationId);
      if (conv) {
        useAppStore.getState().updateConversation(currentConversationId, {
          title: conv.title === '新对话' ? input.trim().slice(0, 30) : conv.title,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    const userMessage: Message = {
      id: uuidv4(),
      conversationId: currentConversationId,
      role: 'user',
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };
    addMessage(currentConversationId, userMessage);
    setInput('');
    setIsLoading(true);

    const assistantMessageId = uuidv4();
    const assistantMessage: Message = {
      id: assistantMessageId,
      conversationId: currentConversationId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };
    addMessage(currentConversationId, assistantMessage);
    setStreamingMessageId(assistantMessageId);

    try {
      const chatMessages = [
        ...currentMessages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: input.trim() },
      ];
      await invoke('send_chat_request_stream', {
        endpoint: currentModel.endpoint,
        apiKey: currentModel.apiKey || null,
        model: currentModel.modelIdentifier,
        messages: chatMessages,
        temperature: currentModel.temperature,
        maxTokens: 2048,
        requestId: assistantMessageId,
      });
    } catch (error) {
      updateMessage(currentConversationId, assistantMessageId, {
        content: `错误: ${error}`,
      });
      setIsLoading(false);
      setStreamingMessageId(null);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setStreamingMessageId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  /* ---------- 未选择对话 ---------- */
  if (!currentConversationId) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState
          icon={<MessageSquare size={20} />}
          title="开始新对话"
          description="在左侧选择一个已有对话，或创建一个新的对话。"
        />
      </div>
    );
  }

  /* ---------- 对话主界面 ---------- */
  return (
    <div className="flex min-h-0 flex-1 flex-col p-4">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface">
        {/* 顶栏 */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line px-6">
          <h1 className="truncate text-sm font-semibold text-fg">
            {currentConversation?.title || '新对话'}
          </h1>
          {currentModel ? (
            <Badge tone="accent">{currentModel.name}</Badge>
          ) : (
            <Badge tone="warning">未选择模型</Badge>
          )}
        </header>

        {/* 消息流 */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-6 py-6">
            {currentMessages.length === 0 ? (
              <EmptyState
                className="border-transparent bg-transparent shadow-none pt-20"
                icon={<Sparkles size={28} />}
                title="你好，我是 Omni Code"
                description="用自然语言描述你的目标，我会自主规划、调用工具并完成编码任务。"
              />
            ) : (
              <div className="space-y-5">
                {currentMessages.map((message) => {
                  const isUser = message.role === 'user';
                  return (
                    <div
                      key={message.id}
                      className={cn('flex flex-col gap-1.5', isUser ? 'items-end' : 'items-start')}
                    >
                      <span className="px-1 text-[11px] font-medium uppercase tracking-wide text-fg-muted">
                        {isUser ? '你' : 'Omni Code'}
                      </span>
                      <div
                        className={cn(
                          'max-w-[85%] rounded-lg border px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
                          isUser
                            ? 'border-accent bg-accent text-accent-solid'
                            : 'border-line bg-surface text-fg shadow-sm'
                        )}
                      >
                        {message.content}
                        {streamingMessageId === message.id && (
                          <span className="ml-0.5 inline-block h-4 w-[3px] translate-y-0.5 animate-pulse rounded-full bg-accent" />
                        )}

                        {message.reasoning && (
                          <details className="mt-3 border-t border-line pt-2 text-xs opacity-80">
                            <summary className="cursor-pointer select-none font-medium">
                              思考过程
                            </summary>
                            <p className="mt-1.5 whitespace-pre-wrap">{message.reasoning}</p>
                          </details>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* 输入区 */}
        <div className="shrink-0 px-6 py-4">
          <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-xl border border-line bg-surface shadow-md transition-[border-color,box-shadow] duration-150 focus-within:border-accent focus-within:shadow-[var(--shadow-focus)]">
            {/* 输入框 */}
            <div className="flex items-end gap-2 px-4 pt-4 pb-3">
              <button
                type="button"
                title="添加附件"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-fg-muted transition-colors duration-150 hover:bg-surface-hover hover:text-fg focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
              >
                <Paperclip size={16} />
              </button>

              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={currentModel ? `向 ${currentModel.name} 提问…` : '请先在模型库中选择一个模型'}
                className="max-h-[240px] min-h-[48px] flex-1 border-0 bg-transparent px-1 py-2 shadow-none focus:shadow-none"
                rows={2}
                disabled={!currentModel || isLoading}
              />
            </div>

            {/* 控制行：模型选择 + 模式选择 + 发送按钮 */}
            <div className="flex items-center gap-2 px-3 pb-3 pt-1">
              <Select
                selectSize="sm"
                value={currentModelId || ''}
                onChange={(e) => useAppStore.getState().setCurrentModel(e.target.value)}
                className="w-auto min-w-[140px]"
                disabled={!currentModel}
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>

              <Segmented
                size="sm"
                options={[
                  { value: 'chat', label: '对话' },
                  { value: 'agent', label: '智能体' },
                ]}
                value={settings.chatMode}
                onChange={(v) => updateSettings({ chatMode: v as ChatMode })}
              />

              <div className="flex-1" />

              {isLoading ? (
                <Button variant="danger" onClick={handleStop} className="h-8 w-8 shrink-0 p-0">
                  <Square size={14} />
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={!input.trim() || !currentModel}
                  className="h-8 w-8 shrink-0 p-0"
                >
                  <Send size={15} />
                </Button>
              )}
            </div>
          </div>

          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-fg-muted">
            {currentModel ? (
              <>
                当前模型 <span className="font-medium text-fg-secondary">{currentModel.name}</span>
                <span className="text-fg-muted/60">·</span> Enter 发送，Shift + Enter 换行
              </>
            ) : (
              <>
                <AlertTriangle size={12} className="text-warning" />
                <span className="text-warning">请先在模型库中添加并选择一个模型</span>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
