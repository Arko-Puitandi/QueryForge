import React, { useState } from 'react';
import { Button } from '../common';
import { Download, Copy, FileCode, Check, Database, Layers, GitBranch, AlertTriangle } from 'lucide-react';
import { VisualQuery } from '../../types';
import { SQLGenerator } from '../../utils/sqlGenerator';

interface AdvancedSQLFeaturesProps {
  visualQuery: VisualQuery;
  databaseType: string;
}

export const AdvancedSQLFeatures: React.FC<AdvancedSQLFeaturesProps> = ({
  visualQuery,
  databaseType,
}) => {
  const [copied, setCopied] = useState<string | null>(null);

  const generator = new SQLGenerator(databaseType as any);
  
  // Check if we have a valid query
  const hasValidQuery = visualQuery?.tables && visualQuery.tables.length > 0;
  
  let baseSQL = '';
  let generateError = '';
  
  if (hasValidQuery) {
    try {
      baseSQL = generator.generate(visualQuery);
    } catch (error) {
      generateError = error instanceof Error ? error.message : 'Failed to generate SQL';
    }
  }

  const handleCopy = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // If no valid query, show message
  if (!hasValidQuery || generateError) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Query to Export</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {generateError || 'Please add at least one table to your query before exporting. Go to the Tables tab and add tables from your schema.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Generate EXPLAIN query
  const explainQuery = `EXPLAIN ANALYZE\n${baseSQL}`;

  // Generate COUNT query
  const countQuery = baseSQL.replace(/SELECT[\s\S]*?FROM/i, 'SELECT COUNT(*) as total_rows\nFROM');

  // Generate paginated query
  const paginatedQuery = `-- Page 1 (items 1-10)\n${baseSQL.includes('LIMIT') ? baseSQL : `${baseSQL}\nLIMIT 10 OFFSET 0`}`;

  // Generate CREATE VIEW
  const viewName = visualQuery.name?.replace(/\s+/g, '_').toLowerCase() || 'query';
  const createView = `CREATE VIEW ${viewName} AS\n${baseSQL};`;

  // Generate CREATE MATERIALIZED VIEW (PostgreSQL)
  const createMaterializedView = `CREATE MATERIALIZED VIEW ${viewName}_mv AS\n${baseSQL};`;

  // Generate CTE (Common Table Expression) version
  const cteQuery = `WITH query_results AS (\n  ${baseSQL.replace(/\n/g, '\n  ')}\n)\nSELECT * FROM query_results;`;

  // Generate subquery template
  const subqueryTemplate = `SELECT *\nFROM (\n  ${baseSQL.replace(/\n/g, '\n  ')}\n) AS subquery\nWHERE /* add additional filters */;`;

  // Generate EXISTS check
  const existsQuery = `SELECT EXISTS (\n  ${baseSQL.replace(/\n/g, '\n  ')}\n) AS has_results;`;

  // Generate INSERT from SELECT
  const insertFromSelect = `-- Insert results into a new table\nCREATE TABLE ${viewName}_results AS\n${baseSQL};`;

  // Generate DELETE using query
  const deleteQuery = `-- DELETE using this query\nDELETE FROM ${visualQuery.tables[0]?.tableName || 'table_name'}\nWHERE id IN (\n  SELECT id FROM (\n    ${baseSQL.replace(/\n/g, '\n    ')}\n  ) AS to_delete\n);`;

  // Generate UPDATE template
  const updateQuery = `-- UPDATE using this query\nUPDATE ${visualQuery.tables[0]?.tableName || 'table_name'}\nSET column_name = 'new_value'\nWHERE id IN (\n  SELECT id FROM (\n    ${baseSQL.replace(/\n/g, '\n    ')}\n  ) AS to_update\n);`;

  const features = [
    {
      id: 'base',
      title: 'Current Query',
      description: 'Your generated SQL query',
      icon: FileCode,
      sql: baseSQL,
      color: 'emerald',
      isPrimary: true,
    },
    {
      id: 'explain',
      title: 'EXPLAIN Query',
      description: 'Analyze query execution plan',
      icon: GitBranch,
      sql: explainQuery,
      color: 'blue',
    },
    {
      id: 'count',
      title: 'COUNT Query',
      description: 'Get total row count',
      icon: Database,
      sql: countQuery,
      color: 'green',
    },
    {
      id: 'paginated',
      title: 'Paginated Query',
      description: 'Add pagination support',
      icon: Layers,
      sql: paginatedQuery,
      color: 'purple',
    },
    {
      id: 'view',
      title: 'CREATE VIEW',
      description: 'Save as reusable view',
      icon: FileCode,
      sql: createView,
      color: 'indigo',
    },
    {
      id: 'materialized',
      title: 'MATERIALIZED VIEW',
      description: 'Create cached result set',
      icon: Database,
      sql: createMaterializedView,
      color: 'cyan',
    },
    {
      id: 'cte',
      title: 'CTE Version',
      description: 'Common Table Expression',
      icon: GitBranch,
      sql: cteQuery,
      color: 'orange',
    },
    {
      id: 'subquery',
      title: 'Subquery Template',
      description: 'Use as subquery',
      icon: Layers,
      sql: subqueryTemplate,
      color: 'pink',
    },
    {
      id: 'exists',
      title: 'EXISTS Check',
      description: 'Check if results exist',
      icon: Check,
      sql: existsQuery,
      color: 'teal',
    },
    {
      id: 'insert',
      title: 'INSERT FROM SELECT',
      description: 'Save results to table',
      icon: Database,
      sql: insertFromSelect,
      color: 'emerald',
    },
    {
      id: 'delete',
      title: 'DELETE Template',
      description: 'Delete matching rows',
      icon: Database,
      sql: deleteQuery,
      color: 'red',
    },
    {
      id: 'update',
      title: 'UPDATE Template',
      description: 'Update matching rows',
      icon: Database,
      sql: updateQuery,
      color: 'amber',
    },
  ];

  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    indigo: 'from-indigo-500 to-indigo-600',
    cyan: 'from-cyan-500 to-cyan-600',
    orange: 'from-orange-500 to-orange-600',
    pink: 'from-pink-500 to-pink-600',
    teal: 'from-teal-500 to-teal-600',
    emerald: 'from-emerald-500 to-emerald-600',
    red: 'from-red-500 to-red-600',
    amber: 'from-amber-500 to-amber-600',
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Advanced SQL Features</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Export your query in various formats and use cases
        </p>
      </div>

      {/* Primary Export - Current Query */}
      <div className="bg-white dark:bg-gray-800 border-2 border-emerald-500 dark:border-emerald-400 rounded-lg overflow-hidden shadow-lg">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCode className="w-6 h-6 text-white" />
              <div>
                <h4 className="font-bold text-white text-lg">Export Current Query</h4>
                <p className="text-sm text-white/80">Your generated SQL query ready to use</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleCopy(baseSQL, 'primary')}
                variant="secondary"
                size="sm"
                className="!bg-white/20 !text-white hover:!bg-white/30 !border-white/30"
              >
                {copied === 'primary' ? (
                  <>
                    <Check className="w-4 h-4 mr-1.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1.5" />
                    Copy SQL
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleDownload(baseSQL, `${viewName}.sql`)}
                variant="secondary"
                size="sm"
                className="!bg-white/20 !text-white hover:!bg-white/30 !border-white/30"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Download
              </Button>
            </div>
          </div>
        </div>
        <div className="p-4">
          <pre className="text-sm font-mono bg-gray-900 dark:bg-gray-950 text-emerald-400 p-4 rounded-lg border border-gray-700 overflow-x-auto max-h-64">
            {baseSQL}
          </pre>
        </div>
      </div>

      {/* Other SQL Variants */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.filter(f => !f.isPrimary).map((feature) => (
          <div
            key={feature.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className={`bg-gradient-to-r ${colorClasses[feature.color]} px-4 py-3`}>
              <div className="flex items-center gap-3">
                <feature.icon className="w-5 h-5 text-white" />
                <div>
                  <h4 className="font-semibold text-white">{feature.title}</h4>
                  <p className="text-xs text-white/80">{feature.description}</p>
                </div>
              </div>
            </div>

            <div className="p-4">
              <pre className="text-xs font-mono bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-3 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto max-h-32 mb-3">
                {feature.sql}
              </pre>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleCopy(feature.sql, feature.id)}
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                >
                  {copied === feature.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      Copy
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => handleDownload(feature.sql, `${feature.id}_query.sql`)}
                  variant="secondary"
                  size="sm"
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Export All */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Export All Variants</h4>
        <Button
          onClick={() => {
            const allQueries = features.map(f => `-- ${f.title}\n-- ${f.description}\n${f.sql}`).join('\n\n' + '='.repeat(80) + '\n\n');
            handleDownload(allQueries, `${viewName}_all_variants.sql`);
          }}
          variant="primary"
          className="w-full"
        >
          <Download className="w-4 h-4 mr-2" />
          Download All SQL Variants
        </Button>
      </div>
    </div>
  );
};
