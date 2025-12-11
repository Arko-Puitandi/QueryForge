import React, { useState, useRef } from 'react';
import { Button, Textarea } from '../common';
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { VisualQuery } from '../../types';
import { parseSQLToVisualQuery, validateSQL } from '../../services/api';

interface SQLImporterProps {
  onQueryImport: (query: Partial<VisualQuery>) => void;
}

export const SQLImporter: React.FC<SQLImporterProps> = ({
  onQueryImport,
}) => {
  const [sqlInput, setSqlInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [parseResult, setParseResult] = useState<{
    success: boolean;
    message: string;
    warnings?: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportSQL = async () => {
    if (!sqlInput.trim()) return;

    setIsImporting(true);
    setParseResult(null);

    try {
      // First validate the SQL
      const validation = await validateSQL({ sql: sqlInput });
      
      if (validation.success && validation.data) {
        if (!validation.data.isValid) {
          setParseResult({
            success: false,
            message: `SQL validation failed: ${validation.data.errors.join(', ')}`,
            warnings: validation.data.warnings,
          });
          setIsImporting(false);
          return;
        }
      }

      // Parse the SQL to visual query
      const result = await parseSQLToVisualQuery({
        sql: sqlInput,
        schemaContext: [],
      });

      if (result.success && result.data) {
        onQueryImport(result.data);
        setParseResult({
          success: true,
          message: 'SQL query successfully imported and visualized!',
          warnings: validation.data?.warnings,
        });
        setSqlInput('');
      } else {
        setParseResult({
          success: false,
          message: result.error?.message || 'Failed to parse SQL query',
        });
      }
    } catch (error: any) {
      console.error('SQL import error:', error);
      setParseResult({
        success: false,
        message: error.userMessage || error.message || 'Unknown error occurred',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setSqlInput(content);
    };
    reader.readAsText(file);
  };

  const loadSampleQuery = (query: string) => {
    setSqlInput(query);
    setParseResult(null);
  };

  const sampleQueries = [
    {
      name: 'Simple SELECT',
      sql: `SELECT id, name, email, created_at
FROM users
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 10;`,
    },
    {
      name: 'JOIN Query',
      sql: `SELECT u.id, u.name, o.order_id, o.total
FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE o.status = 'completed'
ORDER BY o.created_at DESC;`,
    },
    {
      name: 'Multiple JOINs',
      sql: `SELECT 
  u.name,
  o.order_id,
  p.product_name,
  oi.quantity,
  oi.price
FROM users u
INNER JOIN orders o ON u.id = o.user_id
INNER JOIN order_items oi ON o.id = oi.order_id
INNER JOIN products p ON oi.product_id = p.id
WHERE o.status = 'shipped'
ORDER BY o.created_at DESC
LIMIT 20;`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* SQL Import Header */}
      <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <Upload className="w-6 h-6 text-green-600 dark:text-green-400" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Import SQL Query</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Paste your SQL query or upload a .sql file to visualize it
        </p>
      </div>

      {/* SQL Input Area */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
          <h4 className="font-semibold text-gray-900 dark:text-white">SQL Query</h4>

          <label className="cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              accept=".sql,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button variant="secondary" size="sm" as="span">
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Upload File
            </Button>
          </label>
        </div>

        <div className="p-6">
          <Textarea
            value={sqlInput}
            onChange={(e) => setSqlInput(e.target.value)}
            placeholder="Paste your SQL query here...

Example:
SELECT u.name, o.total
FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE o.total > 100
ORDER BY o.created_at DESC
LIMIT 10;"
            className="min-h-[240px] font-mono text-sm"
            disabled={isImporting}
          />

          <div className="flex items-center gap-2 mt-4">
            <Button
              onClick={handleImportSQL}
              variant="primary"
              disabled={isImporting || !sqlInput.trim()}
              className="flex-1"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Parsing SQL...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Import & Visualize
                </>
              )}
            </Button>

            <Button
              onClick={() => {
                setSqlInput('');
                setParseResult(null);
              }}
              variant="secondary"
              disabled={isImporting}
            >
              Clear
            </Button>
          </div>

          {/* Parse Result */}
          {parseResult && (
            <div
              className={`mt-4 p-4 rounded-lg border ${
                parseResult.success
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}
            >
              <div className="flex items-start gap-3">
                {parseResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${
                    parseResult.success
                      ? 'text-green-900 dark:text-green-300'
                      : 'text-red-900 dark:text-red-300'
                  }`}>
                    {parseResult.message}
                  </p>
                  {parseResult.warnings && parseResult.warnings.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                      {parseResult.warnings.map((warning, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sample Queries */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <h4 className="font-semibold text-gray-900 dark:text-white">Sample SQL Queries</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Click to load a sample query
          </p>
        </div>

        <div className="p-6 space-y-3">
          {sampleQueries.map((sample, index) => (
            <div
              key={index}
              className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-semibold text-gray-900 dark:text-white">{sample.name}</h5>
                <Button
                  onClick={() => loadSampleQuery(sample.sql)}
                  variant="secondary"
                  size="sm"
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                  Use This
                </Button>
              </div>
              <pre className="text-xs text-gray-600 dark:text-gray-400 font-mono overflow-x-auto bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600">
                {sample.sql}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
