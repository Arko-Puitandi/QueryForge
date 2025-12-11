import React, { useEffect } from 'react';
import { MainLayout } from './components/layout';
import { DashboardPage, SchemaPage, QueryPage, CodePage, HistoryPage, SettingsPage, VisualDesignerPage } from './pages';
import { AIChatAssistant, CommandPalette } from './components/common';
import { useAppStore } from './stores';

const App: React.FC = () => {
  const { activePage, theme } = useAppStore();

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

  return (
    <>
      <MainLayout>
        {renderPage()}
      </MainLayout>
      <AIChatAssistant />
      <CommandPalette />
    </>
  );
};

export default App;
