import React from 'react';
import { useAppStore } from '../../stores';
import { Button, Select } from '../common';
import { DatabaseType, TargetLanguage } from '../../types';

export const Header: React.FC = () => {
  const {
    sidebarOpen,
    setSidebarOpen,
    selectedDatabase,
    setSelectedDatabase,
    selectedLanguage,
    setSelectedLanguage,
  } = useAppStore();

  const databaseOptions = [
    { value: 'postgresql', label: 'PostgreSQL' },
    { value: 'mysql', label: 'MySQL' },
    { value: 'sqlite', label: 'SQLite' },
    { value: 'mongodb', label: 'MongoDB' },
    { value: 'sqlserver', label: 'SQL Server' },
  ];

  const languageOptions = [
    { value: 'java', label: 'Java' },
    { value: 'python', label: 'Python' },
    { value: 'nodejs', label: 'Node.js' },
    { value: 'csharp', label: 'C#' },
    { value: 'go', label: 'Go' },
  ];

  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          QueryForge - AI Database Platform
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Database:</span>
          <Select
            options={databaseOptions}
            value={selectedDatabase}
            onChange={(e) => setSelectedDatabase(e.target.value as DatabaseType)}
            className="w-36"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Language:</span>
          <Select
            options={languageOptions}
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value as TargetLanguage)}
            className="w-32"
          />
        </div>
      </div>
    </header>
  );
};
