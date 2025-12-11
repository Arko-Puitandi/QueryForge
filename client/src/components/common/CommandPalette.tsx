import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../stores';
import { Search, Command, ChevronRight } from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  action: () => void;
  keywords?: string[];
  category?: string;
}

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { setActivePage, setCurrentSchema } = useAppStore();

  const commands: CommandItem[] = [
    {
      id: 'dashboard',
      label: 'Go to Dashboard',
      action: () => setActivePage('dashboard'),
      keywords: ['home', 'main'],
      category: 'Navigation',
    },
    {
      id: 'schema',
      label: 'Go to Schema Builder',
      action: () => setActivePage('schema'),
      keywords: ['database', 'tables', 'design'],
      category: 'Navigation',
    },
    {
      id: 'query',
      label: 'Go to Query Generator',
      action: () => setActivePage('query'),
      keywords: ['sql', 'select'],
      category: 'Navigation',
    },
    {
      id: 'code',
      label: 'Go to Template Generator',
      action: () => setActivePage('code'),
      keywords: ['generate', 'boilerplate'],
      category: 'Navigation',
    },
    {
      id: 'history',
      label: 'Go to History',
      action: () => setActivePage('history'),
      keywords: ['past', 'previous'],
      category: 'Navigation',
    },
    {
      id: 'clear-schema',
      label: 'Clear Current Schema',
      action: () => setCurrentSchema(null),
      keywords: ['delete', 'remove', 'reset'],
      category: 'Actions',
    },
  ];

  const filteredCommands = commands.filter(cmd => {
    const searchLower = search.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(searchLower) ||
      cmd.keywords?.some(k => k.includes(searchLower)) ||
      cmd.category?.toLowerCase().includes(searchLower)
    );
  });

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // CMD+K or CTRL+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        setSearch('');
        setSelectedIndex(0);
      }

      // ESC to close
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearch('');
      }

      // Arrow navigation
      if (isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
        }
        if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
          e.preventDefault();
          filteredCommands[selectedIndex].action();
          setIsOpen(false);
          setSearch('');
        }
      }
    },
    [isOpen, filteredCommands, selectedIndex]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={() => setIsOpen(false)}
      />

      {/* Command Palette */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 outline-none text-lg"
              autoFocus
            />
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">ESC</kbd>
              to close
            </div>
          </div>

          {/* Commands List */}
          <div className="max-h-96 overflow-y-auto">
            {filteredCommands.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No commands found
              </div>
            ) : (
              <div className="p-2">
                {Object.entries(
                  filteredCommands.reduce((acc, cmd) => {
                    const cat = cmd.category || 'Other';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(cmd);
                    return acc;
                  }, {} as Record<string, CommandItem[]>)
                ).map(([category, items]) => (
                  <div key={category} className="mb-2">
                    <div className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      {category}
                    </div>
                    {items.map((cmd) => {
                      const globalIndex = filteredCommands.indexOf(cmd);
                      return (
                        <button
                          key={cmd.id}
                          onClick={() => {
                            cmd.action();
                            setIsOpen(false);
                            setSearch('');
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                            globalIndex === selectedIndex
                              ? 'bg-blue-500 text-white'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {cmd.icon}
                            <span>{cmd.label}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 opacity-50" />
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">↑</kbd>
                <kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">↓</kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">↵</kbd>
                to select
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Command className="w-3 h-3" />K to toggle
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
