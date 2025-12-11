import React, { useState, useEffect } from 'react';
import { Card } from '../components/common';
import { useAppStore } from '../stores';
import { useQuery } from '../hooks';
import { getRecentQueries } from '../services/api';

export const DashboardPage: React.FC = () => {
  const { currentSchema, selectedDatabase, selectedLanguage, setActivePage } = useAppStore();
  const { isLoading } = useQuery();
  const [recentQueries, setRecentQueries] = useState<any[]>([]);

  // Load recent queries from database
  useEffect(() => {
    const loadRecentQueries = async () => {
      try {
        const queries = await getRecentQueries(5);
        setRecentQueries(queries);
      } catch (error) {
        console.error('Failed to load recent queries:', error);
        setRecentQueries([]);
      }
    };
    loadRecentQueries();
  }, []);

  const stats = [
    {
      title: 'Active Schema',
      value: currentSchema ? 1 : 0,
      icon: '🗄️',
      color: 'from-emerald-500 to-emerald-600',
      description: currentSchema?.name || 'No schema loaded',
    },
    {
      title: 'Database Type',
      value: typeof selectedDatabase === 'string' ? selectedDatabase.toUpperCase() : 'POSTGRESQL',
      icon: '💾',
      color: 'from-purple-500 to-purple-600',
      description: 'Currently selected',
    },
    {
      title: 'Target Language',
      value: typeof selectedLanguage === 'string' ? (selectedLanguage.charAt(0).toUpperCase() + selectedLanguage.slice(1)) : 'TypeScript',
      icon: '💻',
      color: 'from-orange-500 to-orange-600',
      description: 'For code generation',
    },
    {
      title: 'AI Agent',
      value: 'Gemini 2.0 Flash',
      icon: '🤖',
      color: 'from-blue-500 to-blue-600',
      description: 'Current AI model',
    },
  ];

  const quickActions = [
    {
      title: 'Schema Builder',
      description: 'Generate database schema with AI',
      icon: '🏗️',
      page: 'schema' as const,
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      title: 'Visual Designer',
      description: 'Design schemas visually',
      icon: '🎨',
      page: 'visual-designer' as const,
      color: 'bg-indigo-500 hover:bg-indigo-600',
    },
    {
      title: 'Query Generator',
      description: 'Convert text to SQL with AI',
      icon: '✨',
      page: 'query' as const,
      color: 'bg-emerald-500 hover:bg-emerald-600',
    },
    {
      title: 'Template Generator',
      description: 'Generate backend code',
      icon: '⚡',
      page: 'code' as const,
      color: 'bg-purple-500 hover:bg-purple-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Welcome to QueryForge - Your AI-powered database platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            isLoading 
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
              : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
          }`}>
            {isLoading ? '⏳ Processing...' : '✓ Ready'}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={stat.title}
            className="relative overflow-hidden rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5`} />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl drop-shadow-sm">{stat.icon}</span>
                <span className={`text-2xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                  {stat.value}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{stat.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">{stat.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <Card title="Quick Actions">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.title}
              onClick={() => setActivePage(action.page)}
              className="group p-5 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300 border border-transparent hover:border-gray-200 dark:hover:border-gray-500 hover:shadow-md text-left w-full"
            >
              <div className="flex items-start gap-3">
                <span className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center text-white text-2xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg flex-shrink-0`}>
                  {action.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{action.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Recent Queries - Full Width */}
      <Card title="Recent Queries">
        {recentQueries.length > 0 ? (
            <div className="space-y-3">
              {recentQueries.map((query, index) => (
                <div
                  key={query.id || index}
                  className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white truncate">
                        {query.naturalLanguage}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono truncate">
                        {query.sqlQuery ? query.sqlQuery.substring(0, 60) : 'N/A'}...
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {query.databaseType || 'SQL'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <span className="text-4xl mb-3 block">📝</span>
              <p>No queries yet</p>
              <p className="text-sm mt-1">Generate your first SQL query to see it here</p>
            </div>
          )}
      </Card>

      {/* Current Schema Summary */}
      {currentSchema && (
        <Card title={`Current Schema: ${currentSchema.name}`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {currentSchema.tables.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Tables</div>
            </div>
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {currentSchema.tables.reduce((acc, t) => acc + t.columns.length, 0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Columns</div>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {currentSchema.relationships?.length || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Relationships</div>
            </div>
            <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {currentSchema.tables.reduce((acc, t) => acc + (t.indexes?.length || 0), 0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Indexes</div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {currentSchema.tables.map((table) => (
              <span
                key={table.name}
                className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300"
              >
                {table.name}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
