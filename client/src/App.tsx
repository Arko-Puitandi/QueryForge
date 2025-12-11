import React, { useEffect } from 'react';
import { MainLayout } from './components/layout';
import { DashboardPage, SchemaPage, QueryPage, CodePage, HistoryPage, SettingsPage, VisualDesignerPage, VisualQueryBuilderPage } from './pages';
import { AIChatAssistant, CommandPalette, SchemaChangeModal, Loading } from './components/common';
import { useAppStore } from './stores';

const App: React.FC = () => {
  const { activePage, theme, loadSessionFromServer, isLoadingSession } = useAppStore();

  // Load session from server on app start
  useEffect(() => {
    loadSessionFromServer();
  }, [loadSessionFromServer]);

  // Apply theme to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'schema':
        return <SchemaPage />;
      case 'query':
        return <QueryPage />;
      case 'visual-query-builder':
        return <VisualQueryBuilderPage />;
      case 'code':
        return <CodePage />;
      case 'history':
        return <HistoryPage />;
      case 'settings':
        return <SettingsPage />;
      case 'visual-designer':
        return <VisualDesignerPage />;
      default:
        return <DashboardPage />;
    }
  };

  // Show loading while fetching session
  if (isLoadingSession) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loading size="lg" />
          <p className="mt-4 text-gray-400">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <MainLayout>
        {renderPage()}
      </MainLayout>
      <AIChatAssistant />
      <CommandPalette />
      <SchemaChangeModal />
    </>
  );
};

export default App;
