import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { ModelLibrary } from './components/ModelLibrary';
import { SettingsView } from './components/SettingsView';
import { AuthPage } from './components/AuthPage';
import { PluginManager } from './components/PluginManager';
import { MemoryManager } from './components/MemoryManager';
import { KnowledgeBase } from './components/KnowledgeBase';
import { useAppStore } from './store/useAppStore';
import { useThemeEffect } from './lib/theme';
import { I18nProvider } from './i18n';

type Page = 'chat' | 'models' | 'settings' | 'plugins' | 'memory' | 'knowledge';

function App() {
  const { currentUser, authToken, settings } = useAppStore();
  const [currentPage, setCurrentPage] = useState<Page>('chat');

  useThemeEffect(settings.theme);

  if (!currentUser || !authToken) {
    return (
      <I18nProvider locale={settings.language}>
        <AuthPage />
      </I18nProvider>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'chat':
        return <ChatView />;
      case 'models':
        return <ModelLibrary />;
      case 'settings':
        return <SettingsView />;
      case 'plugins':
        return <PluginManager />;
      case 'memory':
        return <MemoryManager />;
      case 'knowledge':
        return <KnowledgeBase />;
      default:
        return <ChatView />;
    }
  };

  return (
    <I18nProvider locale={settings.language}>
      <div className="flex h-screen w-screen overflow-hidden bg-app text-fg">
        <Sidebar onNavigate={setCurrentPage} currentPage={currentPage} />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{renderPage()}</main>
      </div>
    </I18nProvider>
  );
}

export default App;
