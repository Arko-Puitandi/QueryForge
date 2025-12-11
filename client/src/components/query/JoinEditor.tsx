import React, { useState } from 'react';
import { QueryJoin, QueryTable, Table } from '../../types';
import { Button } from '../common';
import { Plus, Trash2, Edit2, Check, Link as LinkIcon } from 'lucide-react';

interface JoinEditorProps {
  joins: QueryJoin[];
  tables: QueryTable[];
  schemaContext: Table[];
  onJoinAdd: (join: QueryJoin) => void;
  onJoinUpdate: (joinId: string, updates: Partial<QueryJoin>) => void;
  onJoinRemove: (joinId: string) => void;
}

export const JoinEditor: React.FC<JoinEditorProps> = ({
  joins,
  tables,
  schemaContext,
  onJoinAdd,
  onJoinUpdate,
  onJoinRemove,
}) => {
  const [editingJoin, setEditingJoin] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const getTableName = (tableId: string) => {
    return tables.find(t => t.id === tableId)?.tableName || 'Unknown';
  };

  const getTableColumns = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return [];
    const schemaTable = schemaContext.find(t => t.name === table.tableName);
    return schemaTable?.columns || [];
  };

  const handleAddJoin = () => {
    if (tables.length < 2) {
      alert('You need at least 2 tables to create a join');
      return;
    }

    const newJoin: QueryJoin = {
      id: `join_${Date.now()}`,
      fromTableId: tables[0].id,
      toTableId: tables[1].id,
      joinType: 'INNER',
      conditions: [{
        fromColumn: '',
        toColumn: '',
        operator: '=',
      }],
    };

    onJoinAdd(newJoin);
    setEditingJoin(newJoin.id);
    setShowAddForm(false);
  };

  const updateJoinCondition = (joinId: string, conditionIndex: number, field: string, value: string) => {
    const join = joins.find(j => j.id === joinId);
    if (!join) return;

    const updatedConditions = [...join.conditions];
    updatedConditions[conditionIndex] = {
      ...updatedConditions[conditionIndex],
      [field]: value,
    };

    onJoinUpdate(joinId, { conditions: updatedConditions });
  };

  const addJoinCondition = (joinId: string) => {
    const join = joins.find(j => j.id === joinId);
    if (!join) return;

    const newCondition = {
      fromColumn: '',
      toColumn: '',
      operator: '=' as const,
    };

    onJoinUpdate(joinId, {
      conditions: [...join.conditions, newCondition],
    });
  };

  const removeJoinCondition = (joinId: string, conditionIndex: number) => {
    const join = joins.find(j => j.id === joinId);
    if (!join || join.conditions.length <= 1) return;

    const updatedConditions = join.conditions.filter((_, i) => i !== conditionIndex);
    onJoinUpdate(joinId, { conditions: updatedConditions });
  };

  const joinTypeOptions = [
    { value: 'INNER', label: 'INNER JOIN', description: 'Returns rows with matching values in both tables' },
    { value: 'LEFT', label: 'LEFT JOIN', description: 'All rows from left table + matched rows from right' },
    { value: 'LEFT OUTER', label: 'LEFT OUTER JOIN', description: 'Explicit LEFT OUTER JOIN syntax' },
    { value: 'RIGHT', label: 'RIGHT JOIN', description: 'All rows from right table + matched rows from left' },
    { value: 'RIGHT OUTER', label: 'RIGHT OUTER JOIN', description: 'Explicit RIGHT OUTER JOIN syntax' },
    { value: 'FULL', label: 'FULL OUTER JOIN', description: 'All rows from both tables with NULLs for unmatched' },
    { value: 'FULL OUTER', label: 'FULL OUTER JOIN (Explicit)', description: 'Explicit FULL OUTER syntax' },
    { value: 'CROSS', label: 'CROSS JOIN', description: 'Cartesian product (every row combined)' },
    { value: 'SELF', label: 'SELF JOIN', description: 'Join table to itself' },
    { value: 'NATURAL', label: 'NATURAL JOIN', description: 'Join on columns with same names (use with caution)' },
    { value: 'LEFT ANTI', label: 'LEFT ANTI JOIN', description: 'Rows in left table with no match in right' },
    { value: 'RIGHT ANTI', label: 'RIGHT ANTI JOIN', description: 'Rows in right table with no match in left' },
    { value: 'LEFT SEMI', label: 'LEFT SEMI JOIN', description: 'Rows in left table that have a match in right' },
    { value: 'RIGHT SEMI', label: 'RIGHT SEMI JOIN', description: 'Rows in right table that have a match in left' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Table Joins ({joins.length})
        </h3>
        <Button
          onClick={() => setShowAddForm(true)}
          variant="primary"
          size="sm"
          disabled={tables.length < 2}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Join
        </Button>
      </div>

      {tables.length < 2 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-700 dark:text-blue-300">
          Add at least 2 tables to create joins
        </div>
      )}

      {showAddForm && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-green-900 dark:text-green-300">Create New Join</h4>
            <Button onClick={() => setShowAddForm(false)} variant="secondary" size="sm">
              Cancel
            </Button>
          </div>
          <Button onClick={handleAddJoin} variant="primary" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Create Join
          </Button>
        </div>
      )}

      {joins.length === 0 && !showAddForm ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <LinkIcon className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-600" />
          <p className="font-medium">No joins defined</p>
          <p className="text-sm mt-1">Joins connect multiple tables together</p>
        </div>
      ) : (
        <div className="space-y-3">
          {joins.map((join, joinIndex) => {
            const isEditing = editingJoin === join.id;
            const fromTableName = getTableName(join.fromTableId);
            const toTableName = getTableName(join.toTableId);
            const fromColumns = getTableColumns(join.fromTableId);
            const toColumns = getTableColumns(join.toTableId);

            return (
              <div
                key={join.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold">
                      {joinIndex + 1}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {fromTableName} → {toTableName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <Button
                        onClick={() => setEditingJoin(null)}
                        variant="primary"
                        size="sm"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setEditingJoin(join.id)}
                        variant="secondary"
                        size="sm"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      onClick={() => onJoinRemove(join.id)}
                      variant="secondary"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </Button>
                  </div>
                </div>

                {/* Join Type */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Join Type
                  </label>
                  <select
                    value={join.joinType}
                    onChange={(e) => onJoinUpdate(join.id, { joinType: e.target.value as any })}
                    disabled={!isEditing}
                    className="w-full px-4 py-2.5 rounded-lg border transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {joinTypeOptions.map(opt => (
                      <option key={opt.value} value={opt.value} title={opt.description}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {isEditing && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {joinTypeOptions.find(opt => opt.value === join.joinType)?.description}
                    </p>
                  )}
                </div>

                {/* Join Conditions */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Join Conditions (ON)
                  </label>
                  <div className="space-y-2">
                    {join.conditions.map((condition, condIndex) => (
                      <div key={condIndex} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        {condIndex > 0 && (
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 px-2">
                            AND
                          </span>
                        )}
                        
                        <select
                          value={condition.fromColumn}
                          onChange={(e) => updateJoinCondition(join.id, condIndex, 'fromColumn', e.target.value)}
                          disabled={!isEditing}
                          className="flex-1 px-3 py-2 rounded-lg border transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          <option value="">Select {fromTableName} column</option>
                          {fromColumns.map(col => (
                            <option key={col.name} value={col.name}>
                              {col.name} ({col.type})
                            </option>
                          ))}
                        </select>

                        <span className="text-gray-500 dark:text-gray-400 font-mono">=</span>

                        <select
                          value={condition.toColumn}
                          onChange={(e) => updateJoinCondition(join.id, condIndex, 'toColumn', e.target.value)}
                          disabled={!isEditing}
                          className="flex-1 px-3 py-2 rounded-lg border transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          <option value="">Select {toTableName} column</option>
                          {toColumns.map(col => (
                            <option key={col.name} value={col.name}>
                              {col.name} ({col.type})
                            </option>
                          ))}
                        </select>

                        {isEditing && join.conditions.length > 1 && (
                          <button
                            onClick={() => removeJoinCondition(join.id, condIndex)}
                            className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}

                    {isEditing && (
                      <Button
                        onClick={() => addJoinCondition(join.id)}
                        variant="secondary"
                        size="sm"
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Condition
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
