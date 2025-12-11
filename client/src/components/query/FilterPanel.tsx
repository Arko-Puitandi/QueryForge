import React, { useState } from 'react';
import { FilterGroup, FilterCondition, FilterOperator, LogicalOperator, QueryTable } from '../../types';
import { Plus, Trash2, X } from 'lucide-react';
import { Button, Input, Select } from '../common';

interface FilterPanelProps {
  filters: FilterGroup;
  tables: QueryTable[];
  schemaContext: any[];
  onFiltersChange: (filters: FilterGroup) => void;
}

const OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: '=', label: 'Equals (=)' },
  { value: '!=', label: 'Not Equals (!=)' },
  { value: '>', label: 'Greater Than (>)' },
  { value: '<', label: 'Less Than (<)' },
  { value: '>=', label: 'Greater or Equal (>=)' },
  { value: '<=', label: 'Less or Equal (<=)' },
  { value: 'LIKE', label: 'Like' },
  { value: 'NOT LIKE', label: 'Not Like' },
  { value: 'IN', label: 'In' },
  { value: 'NOT IN', label: 'Not In' },
  { value: 'BETWEEN', label: 'Between' },
  { value: 'IS NULL', label: 'Is Null' },
  { value: 'IS NOT NULL', label: 'Is Not Null' },
];

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  tables,
  schemaContext,
  onFiltersChange,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['root']));

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const addFilter = (groupId: string = 'root') => {
    const newFilter: FilterCondition = {
      id: `filter_${Date.now()}`,
      tableId: tables[0]?.id || '',
      column: '',
      operator: '=',
      value: '',
    };

    const addToGroup = (group: FilterGroup): FilterGroup => {
      if (group.id === groupId) {
        return {
          ...group,
          conditions: [...group.conditions, newFilter],
        };
      }
      return {
        ...group,
        conditions: group.conditions.map(c =>
          'isGroup' in c && c.isGroup ? addToGroup(c as FilterGroup) : c
        ),
      };
    };

    onFiltersChange(addToGroup(filters));
  };

  const addGroup = (parentId: string = 'root') => {
    const newGroup: FilterGroup = {
      id: `group_${Date.now()}`,
      operator: 'AND',
      conditions: [],
      isGroup: true,
    };

    const addToGroup = (group: FilterGroup): FilterGroup => {
      if (group.id === parentId) {
        return {
          ...group,
          conditions: [...group.conditions, newGroup],
        };
      }
      return {
        ...group,
        conditions: group.conditions.map(c =>
          'isGroup' in c && c.isGroup ? addToGroup(c as FilterGroup) : c
        ),
      };
    };

    onFiltersChange(addToGroup(filters));
    setExpandedGroups(prev => new Set(prev).add(newGroup.id));
  };

  const removeCondition = (conditionId: string) => {
    const removeFromGroup = (group: FilterGroup): FilterGroup => ({
      ...group,
      conditions: group.conditions
        .filter(c => c.id !== conditionId)
        .map(c => 'isGroup' in c && c.isGroup ? removeFromGroup(c as FilterGroup) : c),
    });

    onFiltersChange(removeFromGroup(filters));
  };

  const updateFilter = (filterId: string, updates: Partial<FilterCondition>) => {
    const updateInGroup = (group: FilterGroup): FilterGroup => ({
      ...group,
      conditions: group.conditions.map(c => {
        if ('isGroup' in c && c.isGroup) {
          return updateInGroup(c as FilterGroup);
        } else if (c.id === filterId) {
          return { ...(c as FilterCondition), ...updates } as FilterCondition;
        }
        return c;
      }) as (FilterCondition | FilterGroup)[],
    });

    onFiltersChange(updateInGroup(filters));
  };

  const updateGroupOperator = (groupId: string, operator: LogicalOperator) => {
    const updateInGroup = (group: FilterGroup): FilterGroup => {
      if (group.id === groupId) {
        return { ...group, operator };
      }
      return {
        ...group,
        conditions: group.conditions.map(c =>
          'isGroup' in c && c.isGroup ? updateInGroup(c as FilterGroup) : c
        ),
      };
    };

    onFiltersChange(updateInGroup(filters));
  };

  const getTableColumns = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return [];

    const schemaTable = schemaContext.find(t => t.name === table.tableName);
    return schemaTable?.columns || [];
  };

  const renderFilterCondition = (condition: FilterCondition) => {
    const columns = getTableColumns(condition.tableId);
    const needsValue = !['IS NULL', 'IS NOT NULL'].includes(condition.operator);
    const needsValue2 = condition.operator === 'BETWEEN';

    return (
      <div key={condition.id} className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200">
        {/* Table Selection */}
        <Select
          value={condition.tableId}
          onChange={(e) => updateFilter(condition.id, { tableId: e.target.value, column: '' })}
          className="w-32"
          options={[
            { value: '', label: 'Select Table' },
            ...tables.map(t => ({ value: t.id, label: t.alias || t.tableName }))
          ]}
        />

        {/* Column Selection */}
        <Select
          value={condition.column}
          onChange={(e) => updateFilter(condition.id, { column: e.target.value })}
          className="w-40"
          disabled={!condition.tableId}
          options={[
            { value: '', label: 'Select Column' },
            ...columns.map((col: any) => ({ value: col.name, label: `${col.name} (${col.type})` }))
          ]}
        />

        {/* Operator */}
        <Select
          value={condition.operator}
          onChange={(e) => updateFilter(condition.id, { operator: e.target.value as FilterOperator })}
          className="w-44"
          options={OPERATORS.map(op => ({ value: op.value, label: op.label }))}
        />

        {/* Value 1 */}
        {needsValue && (
          <Input
            value={condition.value || ''}
            onChange={(e) => updateFilter(condition.id, { value: e.target.value })}
            placeholder={
              condition.operator === 'IN' || condition.operator === 'NOT IN'
                ? "value1, value2, ..."
                : "Value"
            }
            className="flex-1"
          />
        )}

        {/* Value 2 (for BETWEEN) */}
        {needsValue2 && (
          <>
            <span className="text-gray-500 dark:text-gray-400 font-medium">AND</span>
            <Input
              value={condition.value2 || ''}
              onChange={(e) => updateFilter(condition.id, { value2: e.target.value })}
              placeholder="Value 2"
              className="flex-1"
            />
          </>
        )}

        {/* Remove Button */}
        <button
          onClick={() => removeCondition(condition.id)}
          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          title="Remove filter"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  };

  const renderFilterGroup = (group: FilterGroup, level: number = 0): React.ReactNode => {
    const isExpanded = expandedGroups.has(group.id);
    const isRoot = group.id === 'root';

    return (
      <div
        key={group.id}
        className={`${level > 0 ? 'ml-6 mt-2 p-3 border-l-4 border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/20 rounded-r-lg' : ''}`}
      >
        {/* Group Header */}
        {!isRoot && (
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleGroup(group.id)}
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {isExpanded ? '▼' : '▶'} Group
              </button>

              <div className="flex items-center gap-1 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-1">
                <button
                  onClick={() => updateGroupOperator(group.id, 'AND')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    group.operator === 'AND'
                      ? 'bg-blue-600 dark:bg-blue-500 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  AND
                </button>
                <button
                  onClick={() => updateGroupOperator(group.id, 'OR')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    group.operator === 'OR'
                      ? 'bg-blue-600 dark:bg-blue-500 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  OR
                </button>
              </div>
            </div>

            <button
              onClick={() => removeCondition(group.id)}
              className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
              title="Remove group"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Group Contents */}
        {(isRoot || isExpanded) && (
          <div className="space-y-2">
            {group.conditions.map((condition, index) => (
              <React.Fragment key={condition.id}>
                {index > 0 && (
                  <div className="flex items-center justify-center">
                    <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded">
                      {group.operator}
                    </span>
                  </div>
                )}
                {'isGroup' in condition && condition.isGroup
                  ? renderFilterGroup(condition as FilterGroup, level + 1)
                  : renderFilterCondition(condition as FilterCondition)
                }
              </React.Fragment>
            ))}

            {/* Add Buttons */}
            <div className="flex items-center gap-2 mt-2">
              <Button
                onClick={() => addFilter(group.id)}
                variant="secondary"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Filter
              </Button>

              <Button
                onClick={() => addGroup(group.id)}
                variant="secondary"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Group
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Filters (WHERE)</h3>

      {filters.conditions.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="mb-4">No filters added yet</p>
          <Button onClick={() => addFilter()} variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            Add First Filter
          </Button>
        </div>
      ) : (
        renderFilterGroup(filters)
      )}
    </div>
  );
};
