import React, { useState } from 'react';
import { VisualQuery } from '../../types';
import { SQLGenerator } from '../../utils/sqlGenerator';
import { CodeBlock, Button } from '../common';
import { Copy, Download, CheckCircle, AlertCircle, Play } from 'lucide-react';

interface PreviewPanelProps {
  visualQuery: VisualQuery;
  onExecute?: () => void;
  isExecuting?: boolean;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  visualQuery,
  onExecute,
  isExecuting = false,
}) => {
  const [copied, setCopied] = useState(false);

  // Generate SQL with proper null checks
  const generator = new SQLGenerator('postgresql' as any);
  
  // Ensure visualQuery has required properties
  const safeVisualQuery: VisualQuery = {
    ...visualQuery,
    tables: visualQuery?.tables || [],
    selectedColumns: visualQuery?.selectedColumns || [],
    joins: visualQuery?.joins || [],
    filters: visualQuery?.filters,
  };
  
  const validation = generator.validate(safeVisualQuery);
  const generatedSQL = validation.valid ? generator.generate(safeVisualQuery) : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedSQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([generatedSQL], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${visualQuery.name.replace(/\s+/g, '_').toLowerCase()}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">SQL Preview</h3>
        
        <div className="flex items-center gap-2">
          {validation.valid ? (
            <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              Valid
            </span>
          ) : (
            <span className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4" />
              {validation.errors.length} errors
            </span>
          )}

          <Button
            onClick={handleCopy}
            variant="secondary"
            size="sm"
            disabled={!validation.valid}
          >
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </>
            )}
          </Button>

          <Button
            onClick={handleDownload}
            variant="secondary"
            size="sm"
            disabled={!validation.valid}
          >
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>

          {onExecute && (
            <Button
              onClick={onExecute}
              variant="primary"
              size="sm"
              disabled={!validation.valid || isExecuting}
            >
              <Play className="w-4 h-4 mr-1" />
              {isExecuting ? 'Executing...' : 'Execute'}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {!validation.valid ? (
          <div className="space-y-3">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-red-900 dark:text-red-300 mb-2">
                Query Validation Errors:
              </h4>
              <ul className="space-y-1">
                {validation.errors.map((error, index) => (
                  <li key={index} className="text-sm text-red-700 dark:text-red-400 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-400">
              Fix the validation errors above to generate valid SQL.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Generated SQL */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Generated SQL:</h4>
              <CodeBlock code={generatedSQL} language="sql" />
            </div>

            {/* Query Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium uppercase mb-1">
                  Tables
                </div>
                <div className="text-sm text-gray-900 dark:text-white font-semibold">
                  {visualQuery.tables.length}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium uppercase mb-1">
                  Joins
                </div>
                <div className="text-sm text-gray-900 dark:text-white font-semibold">
                  {visualQuery.joins.length}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium uppercase mb-1">
                  Selected Columns
                </div>
                <div className="text-sm text-gray-900 dark:text-white font-semibold">
                  {visualQuery.selectedColumns.length || 'All (*)'}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium uppercase mb-1">
                  Filters
                </div>
                <div className="text-sm text-gray-900 dark:text-white font-semibold">
                  {visualQuery.filters?.conditions.length || 0}
                </div>
              </div>

              {visualQuery.groupBy && (
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 font-medium uppercase mb-1">
                    Group By
                  </div>
                  <div className="text-sm text-gray-900 dark:text-white font-semibold">
                    {visualQuery.groupBy.columns.length} columns
                  </div>
                </div>
              )}

              {visualQuery.orderBy && visualQuery.orderBy.length > 0 && (
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 font-medium uppercase mb-1">
                    Order By
                  </div>
                  <div className="text-sm text-gray-900 dark:text-white font-semibold">
                    {visualQuery.orderBy.length} columns
                  </div>
                </div>
              )}

              {visualQuery.limit !== undefined && (
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 font-medium uppercase mb-1">
                    Limit
                  </div>
                  <div className="text-sm text-gray-900 dark:text-white font-semibold">
                    {visualQuery.limit}
                    {visualQuery.offset ? ` (offset ${visualQuery.offset})` : ''}
                  </div>
                </div>
              )}

              {visualQuery.distinct && (
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 font-medium uppercase mb-1">
                    Distinct
                  </div>
                  <div className="text-sm text-gray-900 dark:text-white font-semibold">
                    Yes
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
