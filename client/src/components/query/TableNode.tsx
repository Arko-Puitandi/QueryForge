import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Table, Column } from '../../types';
import { Database, Key, Link as LinkIcon, Trash2, Edit2, CheckSquare, Square } from 'lucide-react';

interface TableNodeProps {
  data: {
    table: Table;
    onEdit?: () => void;
    onDelete?: () => void;
    onColumnToggle?: (columnName: string) => void;
    selectedColumns?: string[];
    color?: string;
  };
  selected?: boolean;
}

export const TableNode = memo(({ data, selected }: TableNodeProps) => {
  const { table, onEdit, onDelete, onColumnToggle, selectedColumns = [], color = 'purple' } = data;

  const getColumnIcon = (column: Column) => {
    if (column.primaryKey) {
      return <Key className="w-3 h-3 text-yellow-400" />;
    }
    if (column.references) {
      return <LinkIcon className="w-3 h-3 text-blue-400" />;
    }
    return null;
  };

  const colorClasses = {
    purple: 'from-purple-500 to-purple-600',
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    orange: 'from-orange-500 to-orange-600',
    pink: 'from-pink-500 to-pink-600',
    indigo: 'from-indigo-500 to-indigo-600',
    teal: 'from-teal-500 to-teal-600',
    red: 'from-red-500 to-red-600',
    cyan: 'from-cyan-500 to-cyan-600',
    amber: 'from-amber-500 to-amber-600',
  };

  const headerColor = colorClasses[color as keyof typeof colorClasses] || colorClasses.purple;

  return (
    <div
      className={`
        bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 transition-all
        ${selected ? 'border-blue-500 dark:border-blue-400 shadow-xl' : 'border-gray-200 dark:border-gray-700'}
        min-w-[280px] max-w-[320px]
      `}
    >
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-blue-500 border-2 border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-blue-500 border-2 border-white"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-blue-500 border-2 border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-blue-500 border-2 border-white"
      />

      {/* Table Header */}
      <div className={`bg-gradient-to-r ${headerColor} px-4 py-3 rounded-t-lg flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-white" />
          <h3 className="font-bold text-white text-base">{table.name}</h3>
        </div>
        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title="Edit table"
            >
              <Edit2 className="w-4 h-4 text-white" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title="Delete table"
            >
              <Trash2 className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Columns List */}
      <div className="max-h-[400px] overflow-y-auto">
        {table.columns.map((column, _index) => {
          const isSelected = selectedColumns.includes(column.name);
          
          return (
            <div
              key={column.name}
              className={`
                px-4 py-2 flex items-center justify-between border-b border-gray-100 dark:border-gray-700
                hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer
                ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''}
              `}
              onClick={() => onColumnToggle?.(column.name)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {onColumnToggle && (
                  isSelected ? (
                    <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  )
                )}
                {getColumnIcon(column)}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                    {column.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {column.type}
                  </div>
                </div>
              </div>

              {/* Column badges */}
              <div className="flex items-center gap-1 ml-2">
                {column.primaryKey && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 rounded font-medium">
                    PK
                  </span>
                )}
                {column.references && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded font-medium">
                    FK
                  </span>
                )}
                {column.unique && !column.primaryKey && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 rounded font-medium">
                    UQ
                  </span>
                )}
                {!column.nullable && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 rounded font-medium">
                    NN
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Table Footer */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-b-lg text-xs text-gray-600 dark:text-gray-400 flex items-center justify-between">
        <span>{table.columns.length} columns</span>
        {selectedColumns.length > 0 && (
          <span className="text-blue-600 dark:text-blue-400 font-medium">
            {selectedColumns.length} selected
          </span>
        )}
      </div>
    </div>
  );
});

TableNode.displayName = 'TableNode';
