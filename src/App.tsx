import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { ModelLibrary } from './components/ModelLibrary';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { AuthPage } from './components/AuthPage';
import { PluginManager } from './components/PluginManager';
import { MemoryManager } from './components/MemoryManager';
import { useAppStore } from './store/useAppStore';
import { useThemeEffect } from './lib/theme';

type Page = 'chat' | 'models' | 'history' | 'settings' | 'plugins' | 'memory';

function App() {
  const { currentUser, authToken, settings } = useAppStore();
  const [currentPage, setCurrentPage] = useState<Page>('chat');

  useThemeEffect(settings.theme);

  if (!currentUser || !authToken) {
    return <AuthPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'chat':
        return <ChatView />;
      case 'models':
        return <ModelLibrary />;
      case 'history':
        return <HistoryView />;
      case 'settings':
        return <SettingsView />;
      case 'plugins':
        return <PluginManager />;
      case 'memory':
        return <MemoryManager />;
      default:
        return <ChatView />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-app text-fg">
      <Sidebar onNavigate={setCurrentPage} currentPage={currentPage} />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{renderPage()}</main>
    </div>
  );
}

export default App;
