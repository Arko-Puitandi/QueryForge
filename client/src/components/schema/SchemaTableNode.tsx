import React from 'react';
import { Handle, Position } from 'reactflow';
import { Table } from '../../types';
import { Edit2, Trash2, Key, Link as LinkIcon, Database } from 'lucide-react';

interface SchemaTableNodeProps {
  data: {
    table: Table;
    onEdit: () => void;
    onDelete: () => void;
    color: { header: string; text: string };
  };
}

export const SchemaTableNode: React.FC<SchemaTableNodeProps> = ({ data }) => {
  const { table, onEdit, onDelete, color } = data;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border-2 border-gray-300 dark:border-gray-600 min-w-[280px] max-w-[320px]">
      {/* Connection Handles */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-blue-500" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500" />

      {/* Header */}
      <div className={`${color.header} ${color.text} px-4 py-3 rounded-t-lg flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4" />
          <h3 className="font-bold text-sm">{table.name}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="Edit Table"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="Delete Table"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Columns */}
      <div className="max-h-[300px] overflow-y-auto">
        {table.columns.map((column, idx) => (
          <div
            key={idx}
            className={`px-4 py-2 text-sm border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
              idx === table.columns.length - 1 ? 'rounded-b-lg border-b-0' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {column.primaryKey && (
                  <div title="Primary Key">
                    <Key className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                  </div>
                )}
                {column.references && (
                  <div title="Foreign Key">
                    <LinkIcon className="w-3 h-3 text-blue-500 flex-shrink-0" />
                  </div>
                )}
                <span className="font-medium text-gray-900 dark:text-white truncate">
                  {column.name}
                </span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                {column.type}
              </span>
            </div>
            {column.references && (
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 ml-5">
                → {column.references.table}.{column.references.column}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer Info */}
      {table.indexes && table.indexes.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            📑 {table.indexes.length} index{table.indexes.length !== 1 ? 'es' : ''}
          </div>
        </div>
      )}
    </div>
  );
};
