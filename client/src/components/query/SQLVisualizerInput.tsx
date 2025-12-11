import React, { useState } from 'react';
import { Button, Textarea } from '../common';
import { Eye, Code, Wand2, Sparkles, Loader2 } from 'lucide-react';
import { parseSQLToVisualQuery } from '../../services/api';
import { VisualQuery } from '../../types';

interface SQLVisualizerInputProps {
  onVisualize: (query: Partial<VisualQuery>) => void;
}

export const SQLVisualizerInput: React.FC<SQLVisualizerInputProps> = ({ onVisualize }) => {
  const [sqlInput, setSqlInput] = useState('');
  const [isVisualizing, setIsVisualizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleVisualize = async () => {
    if (!sqlInput.trim()) return;

    setIsVisualizing(true);
    setError(null);

    try {
      const result = await parseSQLToVisualQuery({
        sql: sqlInput,
        schemaContext: [],
      });

      if (result.success && result.data) {
        onVisualize(result.data);
        setSqlInput('');
        setIsExpanded(false);
      } else {
        setError(result.error?.message || 'Failed to parse SQL query');
      }
    } catch (err: any) {
      console.error('SQL visualization error:', err);
      setError(err.userMessage || err.message || 'Failed to visualize SQL');
    } finally {
      setIsVisualizing(false);
    }
  };

  if (!isExpanded) {
    return (
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">SQL to Visual</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Paste your SQL query to visualize it
              </p>
            </div>
          </div>
          <Button onClick={() => setIsExpanded(true)} variant="primary" size="sm">
            <Code className="w-4 h-4 mr-2" />
            Enter SQL
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h4 className="font-semibold text-gray-900 dark:text-white">SQL Query Visualizer</h4>
        </div>
        <Button onClick={() => setIsExpanded(false)} variant="secondary" size="sm">
          Collapse
        </Button>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          <Textarea
            value={sqlInput}
            onChange={(e) => {
              setSqlInput(e.target.value);
              setError(null);
            }}
            placeholder={`Paste any SQL query here to visualize it...

Examples:
- SELECT * FROM users WHERE status = 'active'
- SELECT u.name, COUNT(o.id) FROM users u LEFT JOIN orders o ON u.id = o.user_id GROUP BY u.name
- SELECT * FROM products WHERE price > 100 ORDER BY created_at DESC LIMIT 10

Supports all SQL keywords:
SELECT, FROM, WHERE, JOIN, GROUP BY, ORDER BY, LIMIT, UNION, INTERSECT, EXCEPT, WITH (CTE), HAVING, DISTINCT, and more...`}
            className="min-h-[200px] font-mono text-sm"
            disabled={isVisualizing}
          />

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              onClick={handleVisualize}
              disabled={!sqlInput.trim() || isVisualizing}
              variant="primary"
              className="flex-1"
            >
              {isVisualizing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Visualizing...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Visualize SQL Query
                </>
              )}
            </Button>
            <Button
              onClick={() => {
                setSqlInput('');
                setError(null);
              }}
              disabled={isVisualizing}
              variant="secondary"
            >
              Clear
            </Button>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h5 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
              Supported SQL Features:
            </h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-blue-700 dark:text-blue-300">
              <div>✓ All JOIN types</div>
              <div>✓ Subqueries</div>
              <div>✓ CTEs (WITH)</div>
              <div>✓ UNION/INTERSECT</div>
              <div>✓ Window Functions</div>
              <div>✓ Aggregates</div>
              <div>✓ GROUP BY/HAVING</div>
              <div>✓ Complex WHERE</div>
              <div>✓ ORDER BY</div>
              <div>✓ LIMIT/OFFSET</div>
              <div>✓ DISTINCT</div>
              <div>✓ And more...</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
