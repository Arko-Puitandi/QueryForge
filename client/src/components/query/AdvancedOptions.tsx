import React from 'react';
import { QueryTable } from '../../types';
import { Button } from '../common';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

interface OrderByColumn {
  column: string;
  direction: 'ASC' | 'DESC';
}

interface AdvancedOptionsProps {
  tables: QueryTable[];
  schemaContext: any[];
  groupBy?: {
    columns: string[]; // tableId.columnName format
    having?: {
      conditions: any[];
    };
  };
  orderBy?: OrderByColumn[];
  onGroupByChange: (groupBy?: { columns: string[]; having?: any }) => void;
  onOrderByChange: (orderBy: OrderByColumn[]) => void;
}

export const AdvancedOptions: React.FC<AdvancedOptionsProps> = ({
  tables,
  schemaContext,
  groupBy,
  orderBy = [],
  onGroupByChange,
  onOrderByChange,
}) => {
  const getAllColumns = () => {
    const columns: Array<{ tableId: string; tableName: string; columnName: string; columnType: string }> = [];
    
    tables.forEach(table => {
      const schemaTable = schemaContext.find(t => t.name === table.tableName);
      if (schemaTable) {
        schemaTable.columns.forEach((col: any) => {
          columns.push({
            tableId: table.id,
            tableName: table.tableName,
            columnName: col.name,
            columnType: col.type,
          });
        });
      }
    });
    
    return columns;
  };

  const allColumns = getAllColumns();

  // GROUP BY handlers
  const addGroupByColumn = () => {
    const newColumns = [...(groupBy?.columns || []), ''];
    onGroupByChange({ ...groupBy, columns: newColumns });
  };

  const updateGroupByColumn = (index: number, value: string) => {
    const newColumns = [...(groupBy?.columns || [])];
    newColumns[index] = value;
    onGroupByChange({ ...groupBy, columns: newColumns });
  };

  const removeGroupByColumn = (index: number) => {
    const newColumns = (groupBy?.columns || []).filter((_, i) => i !== index);
    if (newColumns.length === 0) {
      onGroupByChange(undefined);
    } else {
      onGroupByChange({ ...groupBy, columns: newColumns });
    }
  };

  // ORDER BY handlers
  const addOrderByColumn = () => {
    const newOrderBy: OrderByColumn = {
      column: '',
      direction: 'ASC',
    };
    onOrderByChange([...orderBy, newOrderBy]);
  };

  const updateOrderByColumn = (index: number, field: 'column' | 'direction', value: string) => {
    const newOrderBy = [...orderBy];
    newOrderBy[index] = {
      ...newOrderBy[index],
      [field]: value,
    };
    onOrderByChange(newOrderBy);
  };

  const removeOrderByColumn = (index: number) => {
    onOrderByChange(orderBy.filter((_, i) => i !== index));
  };

  const moveOrderByColumn = (index: number, direction: 'up' | 'down') => {
    const newOrderBy = [...orderBy];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= orderBy.length) return;
    
    [newOrderBy[index], newOrderBy[targetIndex]] = [newOrderBy[targetIndex], newOrderBy[index]];
    onOrderByChange(newOrderBy);
  };

  return (
    <div className="space-y-6">
      {/* GROUP BY Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            GROUP BY
          </h3>
          <Button onClick={addGroupByColumn} variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add Column
          </Button>
        </div>

        {(!groupBy || groupBy.columns.length === 0) ? (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm">No GROUP BY columns defined</p>
            <p className="text-xs mt-1">Group results by one or more columns</p>
          </div>
        ) : (
          <div className="space-y-2">
            {groupBy.columns.map((column, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 w-12">
                  {index + 1}.
                </span>
                <select
                  value={column}
                  onChange={(e) => updateGroupByColumn(index, e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-2 text-sm"
                >
                  <option value="">Select column</option>
                  {allColumns.map((col, i) => (
                    <option key={i} value={`${col.tableId}.${col.columnName}`}>
                      {col.tableName}.{col.columnName} ({col.columnType})
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => removeGroupByColumn(index)}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {groupBy && groupBy.columns.length > 0 && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-700 dark:text-blue-300">
            <strong>Note:</strong> When using GROUP BY, select columns should either be in the GROUP BY clause or use aggregate functions (COUNT, SUM, AVG, MIN, MAX).
          </div>
        )}
      </div>

      {/* ORDER BY Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            ORDER BY
          </h3>
          <Button onClick={addOrderByColumn} variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add Column
          </Button>
        </div>

        {orderBy.length === 0 ? (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm">No ORDER BY columns defined</p>
            <p className="text-xs mt-1">Sort results by one or more columns</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orderBy.map((orderCol, index) => (
              <div key={index} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 w-12">
                  {index + 1}.
                </span>
                
                <select
                  value={orderCol.column}
                  onChange={(e) => updateOrderByColumn(index, 'column', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-2 text-sm"
                >
                  <option value="">Select column</option>
                  {allColumns.map((col, i) => (
                    <option key={i} value={`${col.tableId}.${col.columnName}`}>
                      {col.tableName}.{col.columnName} ({col.columnType})
                    </option>
                  ))}
                </select>

                <select
                  value={orderCol.direction}
                  onChange={(e) => updateOrderByColumn(index, 'direction', e.target.value)}
                  className="w-32 px-3 py-2 rounded-lg border transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-2 text-sm"
                >
                  <option value="ASC">ASC ↑</option>
                  <option value="DESC">DESC ↓</option>
                </select>

                <div className="flex gap-1">
                  <button
                    onClick={() => moveOrderByColumn(index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveOrderByColumn(index, 'down')}
                    disabled={index === orderBy.length - 1}
                    className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => removeOrderByColumn(index)}
                  className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
