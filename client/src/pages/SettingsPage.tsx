import React, { useState } from 'react';
import { Button, Card, Input, Select, Tabs, ConfirmModal } from '../components/common';
import { DatabaseConnection } from '../components/database/DatabaseConnection';
import { useAppStore, useNotificationStore } from '../stores';
import { DatabaseType, TargetLanguage } from '../types';

type ConfirmAction = 'clearHistory' | 'clearSchema' | 'resetSettings' | 'clearAllData' | null;

export const SettingsPage: React.FC = () => {
  const {
    selectedDatabase,
    selectedLanguage,
    theme,
    setSelectedDatabase,
    setSelectedLanguage,
    setTheme,
    clearHistory,
    setCurrentSchema,
    resetAll,
  } = useAppStore();

  const { addNotification } = useNotificationStore();

  const [activeTab, setActiveTab] = useState('general');
  const [apiKey, setApiKey] = useState('');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [maxHistoryItems, setMaxHistoryItems] = useState('50');
  const [autoSave, setAutoSave] = useState(true);
  const [syntaxHighlighting, setSyntaxHighlighting] = useState(true);
  const [lineNumbers, setLineNumbers] = useState(true);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

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
    { value: 'nodejs', label: 'Node.js (TypeScript)' },
    { value: 'csharp', label: 'C#' },
    { value: 'go', label: 'Go' },
  ];

  const themeOptions = [
    { value: 'dark', label: 'Dark Mode' },
    { value: 'light', label: 'Light Mode' },
  ];

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      // In a real app, this would be stored securely
      try {
        localStorage.setItem('gemini_api_key', apiKey);
        addNotification({
          type: 'success',
          title: 'API Key Saved',
          message: 'Your Gemini API key has been saved locally.',
        });
        setApiKey('');
      } catch (error) {
        addNotification({
          type: 'error',
          title: 'Save Failed',
          message: 'Failed to save API key. Storage might be full.',
        });
      }
    }
  };

  const handleClearHistory = () => {
    setConfirmAction('clearHistory');
  };

  const handleClearSchema = () => {
    setConfirmAction('clearSchema');
  };

  const handleResetSettings = () => {
    setConfirmAction('resetSettings');
  };

  const handleClearAllData = () => {
    setConfirmAction('clearAllData');
  };

  const executeConfirmAction = () => {
    switch (confirmAction) {
      case 'clearHistory':
        clearHistory();
        addNotification({
          type: 'success',
          title: 'History Cleared',
          message: 'All query history has been removed.',
        });
        break;
      case 'clearSchema':
        setCurrentSchema(null);
        addNotification({
          type: 'success',
          title: 'Schema Cleared',
          message: 'Current schema has been removed.',
        });
        break;
      case 'resetSettings':
        setSelectedDatabase('postgresql');
        setSelectedLanguage('nodejs');
        setTheme('dark');
        setMaxHistoryItems('50');
        setAutoSave(true);
        setSyntaxHighlighting(true);
        setLineNumbers(true);
        addNotification({
          type: 'success',
          title: 'Settings Reset',
          message: 'All settings have been restored to defaults.',
        });
        break;
      case 'clearAllData':
        resetAll();
        clearHistory();
        localStorage.removeItem('text-to-sql-storage');
        addNotification({
          type: 'success',
          title: 'All Data Cleared',
          message: 'All schemas, queries, and inputs have been cleared.',
        });
        window.location.reload();
        break;
    }
    setConfirmAction(null);
  };

  const getConfirmModalProps = () => {
    switch (confirmAction) {
      case 'clearHistory':
        return {
          title: 'Clear Query History',
          message: 'Are you sure you want to clear all query history? This action cannot be undone.',
          variant: 'warning' as const,
          confirmText: 'Clear History',
        };
      case 'clearSchema':
        return {
          title: 'Clear Current Schema',
          message: 'Are you sure you want to clear the current schema? You will need to upload or create a new one.',
          variant: 'warning' as const,
          confirmText: 'Clear Schema',
        };
      case 'resetSettings':
        return {
          title: 'Reset All Settings',
          message: 'Reset all settings to defaults? This will not affect your history or schema.',
          variant: 'info' as const,
          confirmText: 'Reset Settings',
        };
      case 'clearAllData':
        return {
          title: 'Clear All Data',
          message: 'This will permanently delete ALL data including schemas, queries, and inputs. This action cannot be undone!',
          variant: 'danger' as const,
          confirmText: 'Clear Everything',
        };
      default:
        return {
          title: '',
          message: '',
          variant: 'warning' as const,
          confirmText: 'Confirm',
        };
    }
  };

  const handleExportData = () => {
    const data = {
      settings: {
        selectedDatabase,
        selectedLanguage,
        theme,
        maxHistoryItems,
        autoSave,
        syntaxHighlighting,
        lineNumbers,
      },
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `queryforge-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    addNotification({
      type: 'success',
      title: 'Export Complete',
      message: 'Settings have been exported to a JSON file.',
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Configure your QueryForge preferences and database connections
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'general', label: 'General Settings' },
          { id: 'database', label: 'Database Connection' }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'general' ? (
        <>
          {/* API Configuration */}
          <Card title="API Configuration">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Gemini API Key
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={apiKeyVisible ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Gemini API key"
                />
                <button
                  type="button"
                  onClick={() => setApiKeyVisible(!apiKeyVisible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {apiKeyVisible ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              <Button onClick={handleSaveApiKey} disabled={!apiKey.trim()}>
                Save
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Get your API key from{' '}
              <a
                href="https://makersuite.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Google AI Studio
              </a>
            </p>
          </div>

          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <span className="text-blue-500">ℹ️</span>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium">Server Configuration</p>
                <p className="mt-1">
                  The API key can also be configured on the server via the <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900 rounded">GEMINI_API_KEY</code> environment variable.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Default Preferences */}
      <Card title="Default Preferences">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Default Database"
            options={databaseOptions}
            value={selectedDatabase}
            onChange={(e) => setSelectedDatabase(e.target.value as DatabaseType)}
          />

          <Select
            label="Default Language"
            options={languageOptions}
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value as TargetLanguage)}
          />

          <Select
            label="Theme"
            options={themeOptions}
            value={theme}
            onChange={(e) => setTheme(e.target.value as 'dark' | 'light')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max History Items
            </label>
            <Input
              type="number"
              min="10"
              max="500"
              value={maxHistoryItems}
              onChange={(e) => setMaxHistoryItems(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Editor Settings */}
      <Card title="Editor Settings">
        <div className="space-y-4">
          <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 cursor-pointer">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Auto-save Queries</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Automatically save queries to history
              </div>
            </div>
            <input
              type="checkbox"
              checked={autoSave}
              onChange={(e) => setAutoSave(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 cursor-pointer">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Syntax Highlighting</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Enable syntax highlighting in code blocks
              </div>
            </div>
            <input
              type="checkbox"
              checked={syntaxHighlighting}
              onChange={(e) => setSyntaxHighlighting(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 cursor-pointer">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Line Numbers</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Show line numbers in code editor
              </div>
            </div>
            <input
              type="checkbox"
              checked={lineNumbers}
              onChange={(e) => setLineNumbers(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
        </div>
      </Card>

      {/* Data Management */}
      <Card title="Data Management">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-dark-700">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Query History</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Clear all saved query history
              </div>
            </div>
            <Button variant="outline" onClick={handleClearHistory}>
              Clear History
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-dark-700">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Current Schema</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Remove the currently loaded schema
              </div>
            </div>
            <Button variant="outline" onClick={handleClearSchema}>
              Clear Schema
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-dark-700">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Export Settings</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Download your settings as JSON
              </div>
            </div>
            <Button variant="secondary" onClick={handleExportData}>
              Export
            </Button>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card title="Danger Zone" className="border-red-200 dark:border-red-900">
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-red-800 dark:text-red-300">Reset All Settings</div>
                <div className="text-sm text-red-600 dark:text-red-400">
                  Restore all settings to their default values
                </div>
              </div>
              <Button variant="danger" onClick={handleResetSettings}>
                Reset Settings
              </Button>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-red-800 dark:text-red-300">Clear All Data</div>
                <div className="text-sm text-red-600 dark:text-red-400">
                  Delete all schemas, queries, inputs, and cached data. Start completely fresh.
                </div>
              </div>
              <Button variant="danger" onClick={handleClearAllData}>
                Clear Everything
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* About */}
      <Card title="About">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
              T2S
            </div>
            <div>
              <h3 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">QueryForge</h3>
              <p className="text-gray-500 dark:text-gray-400">Version 1.0.0</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            An enterprise-grade AI-powered platform that converts natural language to SQL queries,
            generates database schemas, and creates production-ready backend code across multiple languages
            and frameworks.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-dark-600">
            <div className="text-center">
              <div className="text-2xl mb-1">🗄️</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">5 Databases</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">💻</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">5 Languages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">🧠</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Gemini AI</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">⚡</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Real-time</div>
            </div>
          </div>
        </div>
      </Card>
        </>
      ) : (
        <DatabaseConnection />
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={executeConfirmAction}
        {...getConfirmModalProps()}
      />
    </div>
  );
};
