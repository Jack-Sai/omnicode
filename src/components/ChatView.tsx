import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Square, MessageSquare, Sparkles, AlertTriangle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useAppStore } from '../store/useAppStore';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '../lib/cn';
import { useTranslation } from '../i18n';
import { Badge, Button, EmptyState, Modal, Select, Segmented, Textarea } from './ui';
import type { Message } from '../types';
import type { ChatMode, ExecutionMode } from '../types';

interface StreamEvent {
  event_type: string;
  content: string | null;
  finish_reason: string | null;
}

export function ChatView() {
  const { t } = useTranslation();
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
  const [showFullAccessConfirm, setShowFullAccessConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 使用 ref 跟踪流式状态，避免 listen 因依赖变化被频繁重建
  const streamingRef = useRef<{ messageId: string | null; conversationId: string | null }>({
    messageId: null,
    conversationId: null,
  });
  streamingRef.current = { messageId: streamingMessageId, conversationId: currentConversationId };

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
      const { messageId, conversationId } = streamingRef.current;

      if (event_type === 'content' && messageId && conversationId) {
        // 从 store 直接读取最新消息，避免闭包捕获旧值
        const state = useAppStore.getState();
        const currentMsg = state.messages[conversationId]?.find((m) => m.id === messageId);
        if (currentMsg) {
          state.updateMessage(conversationId, messageId, {
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
  }, []);

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
      const systemMessage = {
        role: 'system',
        content: `你是 Omni Code，一个专业的本地 AI 编程助手。你的核心能力：

## 核心身份
- 你是一个精通全栈开发的高级工程师
- 你善于理解用户意图，提供精准的代码解决方案
- 你使用中文与用户交流，除非用户使用其他语言

## 工作原则
1. **理解优先**：先充分理解用户需求，必要时提出澄清问题
2. **最佳实践**：始终推荐行业最佳实践和设计模式
3. **代码质量**：编写清晰、可维护、有类型的代码
4. **安全第一**：不硬编码密钥，不引入安全漏洞
5. **渐进式**：复杂任务分步骤完成，每步确认后再继续

## 技术栈精通
- 前端：React、Vue、TypeScript、Tailwind CSS
- 后端：Node.js、Python、Go、Rust
- 数据库：PostgreSQL、MySQL、SQLite、Redis
- DevOps：Docker、CI/CD、Git
- 桌面应用：Tauri、Electron

## 回答规范
- 代码示例使用 TypeScript 优先
- 提供完整可运行的代码，而非片段
- 解释关键设计决策
- 主动指出潜在问题和优化点
- 如涉及 API 调用，说明认证方式和错误处理

## 工具使用
你可以使用以下工具完成任务：
- 文件读写：读取、创建、修改文件
- 命令执行：运行构建、测试、部署命令
- Git 操作：提交、推送、分支管理
- 代码搜索：在项目中查找代码

始终确保代码安全，不泄露敏感信息。`
      };

      const chatMessages = [
        systemMessage,
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
        content: `${t('chat.error.prefix')}${error}`,
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

  const handleExecutionModeChange = (mode: ExecutionMode) => {
    if (mode === 'full') {
      setShowFullAccessConfirm(true);
    } else {
      updateSettings({ executionMode: mode });
    }
  };

  const confirmFullAccess = () => {
    updateSettings({ executionMode: 'full' });
    setShowFullAccessConfirm(false);
  };

  /* ---------- 未选择对话 ---------- */
  if (!currentConversationId) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState
          icon={<MessageSquare size={20} />}
          title={t('chat.no_model.title')}
          description={t('chat.no_model.desc')}
        />
      </div>
    );
  }

  /* ---------- 输入区（提取复用） ---------- */
  const inputArea = (
    <div className="shrink-0 px-6 py-4">
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-xl border border-line bg-surface shadow-md transition-[border-color,box-shadow] duration-150 focus-within:border-accent focus-within:shadow-[var(--shadow-focus)]">
        {/* 输入框 */}
        <div className="flex items-end gap-2 px-4 pt-4 pb-3">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentModel ? t('chat.placeholder').replace('{name}', currentModel.name) : t('chat.placeholder.no_model')}
            className="max-h-[240px] min-h-[48px] flex-1 border-0 bg-transparent px-1 py-2 shadow-none focus:shadow-none"
            rows={2}
            disabled={!currentModel || isLoading}
          />
        </div>

        {/* 控制行：附件 + 模型选择 + 执行模式 + 模式选择 + 发送按钮 */}
        <div className="flex items-center gap-2 px-3 pb-3 pt-1">
          <button
            type="button"
            title={t('chat.attachment')}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-fg-muted transition-colors duration-150 hover:bg-surface-hover hover:text-fg focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]"
          >
            <Paperclip size={16} />
          </button>

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

          <Select
            selectSize="sm"
            value={settings.executionMode}
            onChange={(e) => handleExecutionModeChange(e.target.value as ExecutionMode)}
            className="w-auto"
          >
            <option value="manual">{t('chat.exec.manual')}</option>
            <option value="auto">{t('chat.exec.auto')}</option>
            <option value="full">{t('chat.exec.full')}</option>
          </Select>

          <Segmented
            size="sm"
            options={[
              { value: 'chat', label: t('chat.mode.chat') },
              { value: 'agent', label: t('chat.mode.agent') },
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
            {t('chat.hint.model')} <span className="font-medium text-fg-secondary">{currentModel.name}</span>
            <span className="text-fg-muted/60">·</span> {t('chat.hint.send')}
          </>
        ) : (
          <>
            <AlertTriangle size={12} className="text-warning" />
            <span className="text-warning">{t('chat.hint.no_model')}</span>
          </>
        )}
      </p>
    </div>
  );

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

        {currentMessages.length === 0 ? (
          /* 空对话：EmptyState 在 header 与输入区之间垂直居中 */
          <>
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <EmptyState
                className="border-transparent bg-transparent shadow-none"
                iconClassName="h-16 w-16"
                titleClassName="text-xl"
                icon={<Sparkles size={36} />}
                title={t('chat.empty.title')}
              />
            </div>
            {inputArea}
          </>
        ) : (
          /* 有消息：消息流 + 输入区 */
          <>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-3xl px-6 py-6">
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
                                {t('chat.thinking')}
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
              </div>
            </div>
            {inputArea}
          </>
        )}
      </div>

      <Modal
        open={showFullAccessConfirm}
        onOpenChange={setShowFullAccessConfirm}
        title={t('settings.full_access.title')}
        width="sm"
      >
        <div className="space-y-4 px-1">
          <p className="text-sm text-fg-secondary">{t('settings.full_access.desc')}</p>
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning" />
            <p className="text-xs text-fg-secondary">{t('settings.full_access.warning')}</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowFullAccessConfirm(false)}>
              {t('settings.full_access.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmFullAccess}>
              {t('settings.full_access.confirm')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
