import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { NotificationContainer } from '../common';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6 relative">
          {children}
        </main>
      </div>
      <NotificationContainer />
    </div>
  );
};
