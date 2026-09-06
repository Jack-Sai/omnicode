export interface Model {
  id: string;
  name: string;
  provider: string;
  endpoint: string;
  apiKey?: string;
  modelIdentifier: string;
  contextLength: number;
  temperature: number;
  isDefault: boolean;
  status: 'online' | 'offline' | 'checking';
  sourceType: 'api' | 'local';
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  modelId?: string;
}

export type ExecutionMode = 'manual' | 'auto' | 'full';

export interface AppSettings {
  executionMode: ExecutionMode;
  theme: 'light' | 'dark' | 'system';
  language: 'zh' | 'en';
  workspacePath: string;
}
