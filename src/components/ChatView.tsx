import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Square } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useAppStore } from '../store/useAppStore';
import { v4 as uuidv4 } from 'uuid';
import type { Message } from '../types';

interface StreamEvent {
  event_type: string;
  content: string | null;
  finish_reason: string | null;
}

export function ChatView() {
  const {
    currentConversationId,
    messages,
    addMessage,
    updateMessage,
    models,
    currentModelId,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const currentMessages = currentConversationId ? messages[currentConversationId] || [] : [];
  const currentModel = models.find((m) => m.id === currentModelId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // 监听流式响应
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

    // 创建一个空的 assistant 消息用于流式填充
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
      // 构建消息历史
      const chatMessages = [
        ...currentMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: 'user', content: input.trim() },
      ];

      // 调用流式 API
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

  if (!currentConversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">💬</div>
          <h2 className="text-xl font-medium mb-2">开始新对话</h2>
          <p className="text-sm">选择一个对话或创建新对话</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {currentMessages.length === 0 && (
          <div className="text-center text-gray-500 mt-20">
            <div className="text-5xl mb-4">🤖</div>
            <p className="text-lg font-medium mb-1">你好！我是 Omni Code</p>
            <p className="text-sm">你的 AI 编程助手</p>
          </div>
        )}

        {currentMessages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <div className="whitespace-pre-wrap">
                {message.content}
                {streamingMessageId === message.id && (
                  <span className="inline-block w-2 h-4 ml-1 bg-gray-400 animate-pulse" />
                )}
              </div>
              {message.reasoning && (
                <div className="mt-2 pt-2 border-t border-gray-200/30 text-sm opacity-80">
                  <details>
                    <summary className="cursor-pointer">思考过程</summary>
                    <p className="mt-1">{message.reasoning}</p>
                  </details>
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-3 bg-gray-50 rounded-2xl p-3 border border-gray-200 focus-within:border-blue-400 transition-colors">
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
              <Paperclip size={20} />
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={currentModel ? `向 ${currentModel.name} 提问...` : '请先选择模型...'}
              className="flex-1 resize-none bg-transparent outline-none text-gray-800 placeholder-gray-500 min-h-[24px] max-h-[200px]"
              rows={1}
              disabled={!currentModel || isLoading}
            />

            {isLoading ? (
              <button
                onClick={handleStop}
                className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <Square size={20} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || !currentModel}
                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={20} />
              </button>
            )}
          </div>

          {/* Model Indicator */}
          <div className="mt-2 text-xs text-gray-500 text-center">
            {currentModel ? (
              <span>当前模型: {currentModel.name}</span>
            ) : (
              <span className="text-amber-600">请先在模型库中选择一个模型</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
