import {
  MessageSquare,
  History,
  Cpu,
  Settings,
  Plus,
  ChevronsLeft,
  ChevronsRight,
  Package,
  Brain,
  Sun,
  Moon,
  Trash2,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '../lib/cn';
import { resolveTheme } from '../lib/theme';
import { IconButton } from './ui';

type Page = 'chat' | 'models' | 'history' | 'settings' | 'plugins' | 'memory';

interface SidebarProps {
  onNavigate: (page: Page) => void;
  currentPage: Page;
}

const MENU_ITEMS: { id: Page; icon: React.ReactNode; label: string }[] = [
  { id: 'chat', icon: <MessageSquare size={16} />, label: '对话' },
  { id: 'models', icon: <Cpu size={16} />, label: '模型库' },
  { id: 'memory', icon: <Brain size={16} />, label: '记忆' },
  { id: 'plugins', icon: <Package size={16} />, label: '扩展' },
  { id: 'history', icon: <History size={16} />, label: '历史' },
];

export function Sidebar({ onNavigate, currentPage }: SidebarProps) {
  const {
    conversations,
    currentConversationId,
    setCurrentConversation,
    setPendingConversation,
    clearConversations,
    currentUser,
    sidebarCollapsed,
    toggleSidebar,
    settings,
    updateSettings,
  } = useAppStore();

  const isDark = resolveTheme(settings.theme) === 'dark';

  const handleNewConversation = () => {
    const id = uuidv4();
    setPendingConversation(id);
    onNavigate('chat');
  };

  const toggleTheme = () => updateSettings({ theme: isDark ? 'light' : 'dark' });

  return (
    <>
      <aside
        className={cn(
          'flex h-full shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200',
          sidebarCollapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* 品牌区 */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-line px-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent text-[13px] font-bold text-accent-solid">
          O
        </div>
        {!sidebarCollapsed && (
          <span className="flex-1 truncate text-sm font-semibold tracking-tight text-fg">
            Omni Code
          </span>
        )}
        <IconButton
          label={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
          size="sm"
          onClick={toggleSidebar}
        >
          {sidebarCollapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
        </IconButton>
      </div>

      {/* 新建对话 */}
      <div className={cn('shrink-0 px-3 pt-3', sidebarCollapsed && 'px-2')}>
        <button
          onClick={handleNewConversation}
          title="新对话"
          className={cn(
            'inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-accent bg-accent px-3 text-sm font-medium text-accent-solid',
            'shadow-sm transition-colors duration-150 hover:bg-accent-hover',
            'focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]'
          )}
        >
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm">
            <Plus size={13} />
          </div>
          {!sidebarCollapsed && <span>新对话</span>}
        </button>
      </div>

      {/* 主导航 */}
      <nav className={cn('shrink-0 px-3 py-3', sidebarCollapsed && 'px-2')}>
        <ul className="space-y-0.5">
          {MENU_ITEMS.map((item) => {
            const active = currentPage === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  title={item.label}
                  className={cn(
                    'flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]',
                    active
                      ? 'bg-accent-subtle text-accent'
                      : 'text-fg-secondary hover:bg-surface-hover hover:text-fg',
                    sidebarCollapsed && 'justify-center px-0'
                  )}
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md">
                    {item.icon}
                  </div>
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 对话列表 */}
      <div className={cn('min-h-0 flex-1 overflow-y-auto px-3 pb-2', sidebarCollapsed && 'px-2')}>
        {!sidebarCollapsed && (
          <div className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
            对话列表
          </div>
        )}
        <ul className="space-y-0.5">
          {conversations.slice(0, 20).map((conversation) => {
            const active = currentConversationId === conversation.id;
            return (
              <li key={conversation.id}>
                <button
                  onClick={() => {
                    setCurrentConversation(conversation.id);
                    onNavigate('chat');
                  }}
                  title={conversation.title}
                  className={cn(
                    'flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-sm transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]',
                    active
                      ? 'bg-surface-active text-fg'
                      : 'text-fg-secondary hover:bg-surface-hover hover:text-fg',
                    sidebarCollapsed && 'justify-center px-0'
                  )}
                >
                  {sidebarCollapsed ? (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md">
                      <MessageSquare size={13} />
                    </div>
                  ) : (
                    <span className="truncate">{conversation.title}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* 底部：用户信息 + 操作按钮 */}
      <div className={cn('shrink-0 border-t border-line p-3', sidebarCollapsed && 'p-2')}>
        {currentUser && !sidebarCollapsed && (
          <div className="mb-2 flex items-center gap-2.5 px-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-sm font-semibold text-accent">
              {currentUser.display_name?.charAt(0) || 'U'}
            </div>
            <span className="truncate text-sm font-medium text-fg">{currentUser.display_name}</span>
          </div>
        )}
        {currentUser && sidebarCollapsed && (
          <div className="mb-2 flex justify-center">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-sm font-semibold text-accent">
              {currentUser.display_name?.charAt(0) || 'U'}
            </div>
          </div>
        )}
        <div className={cn('flex items-center gap-1', sidebarCollapsed && 'flex-col')}>
          <IconButton
            label={isDark ? '切换到浅色' : '切换到深色'}
            size="sm"
            onClick={toggleTheme}
            className={cn(!sidebarCollapsed && 'flex-1')}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </IconButton>
          <IconButton
            label="清空对话"
            size="sm"
            onClick={clearConversations}
            className={cn(!sidebarCollapsed && 'flex-1')}
          >
            <Trash2 size={15} />
          </IconButton>
          <button
            onClick={() => onNavigate('settings')}
            title="设置"
            className={cn(
              'inline-flex h-7 items-center gap-2 rounded-md px-2 text-sm font-medium transition-colors duration-150',
              'focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]',
              currentPage === 'settings'
                ? 'bg-accent-subtle text-accent'
                : 'text-fg-secondary hover:bg-surface-hover hover:text-fg',
              sidebarCollapsed ? 'w-7 justify-center px-0' : 'flex-1'
            )}
          >
            <Settings size={15} className="shrink-0" />
            {!sidebarCollapsed && <span>设置</span>}
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}
