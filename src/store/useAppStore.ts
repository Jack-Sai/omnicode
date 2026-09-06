import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Model, Conversation, Message, AppSettings, KnowledgeBase, KnowledgeDocument } from '../types';

interface AuthUser {
  id: string;
  phone: string;
  display_name: string;
  created_at: string;
  last_login: string | null;
}

interface AppState {
  // Auth
  currentUser: AuthUser | null;
  authToken: string | null;
  setCurrentUser: (user: AuthUser | null) => void;
  setAuthToken: (token: string | null) => void;
  logout: () => void;

  // Models
  models: Model[];
  currentModelId: string | null;
  addModel: (model: Model) => void;
  updateModel: (id: string, updates: Partial<Model>) => void;
  removeModel: (id: string) => void;
  setCurrentModel: (id: string) => void;

  // Conversations
  conversations: Conversation[];
  currentConversationId: string | null;
  pendingConversationId: string | null;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  removeConversation: (id: string) => void;
  clearConversations: () => void;
  setCurrentConversation: (id: string | null) => void;
  setPendingConversation: (id: string | null) => void;

  // Messages
  messages: Record<string, Message[]>;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;

  // Settings
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;

  // Knowledge Base
  knowledgeBases: KnowledgeBase[];
  knowledgeDocuments: Record<string, KnowledgeDocument[]>;
  addKnowledgeBase: (kb: KnowledgeBase) => void;
  removeKnowledgeBase: (id: string) => void;
  addKnowledgeDocument: (doc: KnowledgeDocument) => void;
  removeKnowledgeDocument: (id: string) => void;

  // UI State
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth
      currentUser: null,
      authToken: null,
      setCurrentUser: (user) => set({ currentUser: user }),
      setAuthToken: (token) => set({ authToken: token }),
      logout: () => set({ currentUser: null, authToken: null }),

      // Models
      models: [],
      currentModelId: null,
      addModel: (model) =>
        set((state) => ({
          models: [...state.models, model],
          currentModelId: state.currentModelId || model.id,
        })),
      updateModel: (id, updates) =>
        set((state) => ({
          models: state.models.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        })),
      removeModel: (id) =>
        set((state) => ({
          models: state.models.filter((m) => m.id !== id),
          currentModelId: state.currentModelId === id ? (state.models[0]?.id || null) : state.currentModelId,
        })),
      setCurrentModel: (id) => set({ currentModelId: id }),

      // Conversations
      conversations: [],
      currentConversationId: null,
      pendingConversationId: null,
      addConversation: (conversation) =>
        set((state) => ({
          conversations: [conversation, ...state.conversations],
          currentConversationId: conversation.id,
          pendingConversationId: null,
          messages: { ...state.messages, [conversation.id]: [] },
        })),
      updateConversation: (id, updates) =>
        set((state) => ({
          conversations: state.conversations.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),
      removeConversation: (id) =>
        set((state) => {
          const { [id]: _, ...rest } = state.messages;
          return {
            conversations: state.conversations.filter((c) => c.id !== id),
            currentConversationId: state.currentConversationId === id ? null : state.currentConversationId,
            pendingConversationId: state.pendingConversationId === id ? null : state.pendingConversationId,
            messages: rest,
          };
        }),
      clearConversations: () =>
        set({
          conversations: [],
          currentConversationId: null,
          pendingConversationId: null,
          messages: {},
        }),
      setCurrentConversation: (id) => set({ currentConversationId: id, pendingConversationId: null }),
      setPendingConversation: (id) => set({ pendingConversationId: id, currentConversationId: id }),

      // Messages
      messages: {},
      addMessage: (conversationId, message) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: [...(state.messages[conversationId] || []), message],
          },
        })),
      updateMessage: (conversationId, messageId, updates) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: (state.messages[conversationId] || []).map((m) =>
              m.id === messageId ? { ...m, ...updates } : m
            ),
          },
        })),

      // Settings
      settings: {
        executionMode: 'auto',
        chatMode: 'chat',
        theme: 'system',
        language: 'zh',
        workspacePath: '~/OmniCodeWorkspace',
      },
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),

      // Knowledge Base
      knowledgeBases: [],
      knowledgeDocuments: {},
      addKnowledgeBase: (kb) =>
        set((state) => ({
          knowledgeBases: [kb, ...state.knowledgeBases],
          knowledgeDocuments: { ...state.knowledgeDocuments, [kb.id]: [] },
        })),
      removeKnowledgeBase: (id) =>
        set((state) => {
          const { [id]: _, ...rest } = state.knowledgeDocuments;
          return {
            knowledgeBases: state.knowledgeBases.filter((kb) => kb.id !== id),
            knowledgeDocuments: rest,
          };
        }),
      addKnowledgeDocument: (doc) =>
        set((state) => ({
          knowledgeDocuments: {
            ...state.knowledgeDocuments,
            [doc.knowledgeBaseId]: [...(state.knowledgeDocuments[doc.knowledgeBaseId] || []), doc],
          },
        })),
      removeKnowledgeDocument: (id) =>
        set((state) => {
          const updated = { ...state.knowledgeDocuments };
          for (const kbId of Object.keys(updated)) {
            updated[kbId] = updated[kbId].filter((doc) => doc.id !== id);
          }
          return { knowledgeDocuments: updated };
        }),

      // UI State
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    {
      name: 'omni-code-storage',
    }
  )
);
