import React from 'react';
import { useAppStore } from '../../stores';
import { AlertTriangle, Database, ArrowRight, RefreshCw, X, Layers, Table2, GitBranch } from 'lucide-react';
import { Button } from './Button';

export const SchemaChangeModal: React.FC = () => {
  const { 
    pendingSchemaChange, 
    confirmSchemaChange, 
    cancelSchemaChange,
    currentSchema,
    isSyncingWithServer 
  } = useAppStore();

  if (!pendingSchemaChange) return null;

  const currentTableCount = currentSchema?.tables?.length || 0;
  const newTableCount = pendingSchemaChange.schema?.tables?.length || 0;

  const sourceLabels: Record<string, { label: string; color: string }> = {
    history: { label: 'From History', color: 'text-purple-500' },
    visual: { label: 'Visual Designer', color: 'text-blue-500' },
    generated: { label: 'AI Generated', color: 'text-emerald-500' },
    import: { label: 'Imported', color: 'text-orange-500' },
  };

  const source = sourceLabels[pendingSchemaChange.source] || { label: 'New Schema', color: 'text-gray-500' };

  const currentSchemaName = currentSchema?.name || 'Untitled Schema';
  const description = pendingSchemaChange.description || '';
  const newSchemaName = pendingSchemaChange.schema?.name || 
    (description.length > 35 
      ? description.substring(0, 35) + '...'
      : description) || 
    'New Schema';

  const handleConfirm = async () => {
    try {
      await confirmSchemaChange();
    } catch (error) {
      console.error('Failed to change schema:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={cancelSchemaChange}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden transform transition-all animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 px-6 py-5">
          <button
            onClick={cancelSchemaChange}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Change Active Schema?
              </h2>
              <p className="text-white/80 text-sm mt-0.5">
                This action will reset your current work
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Schema Transition Visual */}
          <div className="flex items-center gap-3">
            {/* Current Schema Card */}
            <div className="flex-1 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <Database className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </div>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Current
                </span>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm truncate" title={currentSchemaName}>
                {currentSchemaName}
              </h4>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500 dark:text-gray-400">
                <Table2 className="w-3.5 h-3.5" />
                <span>{currentTableCount} table{currentTableCount !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
              <ArrowRight className="w-5 h-5 text-white" />
            </div>

            {/* New Schema Card */}
            <div className="flex-1 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border-2 border-blue-300 dark:border-blue-700">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                  <Database className="w-4 h-4 text-white" />
                </div>
                <span className={`text-xs font-semibold uppercase tracking-wide ${source.color}`}>
                  {source.label}
                </span>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm truncate" title={newSchemaName}>
                {newSchemaName}
              </h4>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-600 dark:text-gray-400">
                <Table2 className="w-3.5 h-3.5" />
                <span>{newTableCount} table{newTableCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          {/* Warning Box */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <h4 className="font-semibold text-amber-800 dark:text-amber-200 text-sm mb-3 flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              The following will be reset:
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {[
                'Query Builder inputs and results',
                'Visual Query Designer state',
                'Query analysis and optimization'
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                  <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="secondary"
            onClick={cancelSchemaChange}
            disabled={isSyncingWithServer}
            className="flex-1 h-11"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={isSyncingWithServer}
            className="flex-1 h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {isSyncingWithServer ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading...
              </span>
            ) : (
              <>
                <Layers className="w-4 h-4 mr-2" />
                Load Schema
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
