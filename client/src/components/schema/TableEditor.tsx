import React, { useState } from 'react';
import { Button, Input } from '../common';
import { Table, Column } from '../../types';
import { Plus, Trash2, Save, X, Link } from 'lucide-react';

interface TableEditorProps {
  table: Table;
  allTables: Table[];
  onSave: (table: Table) => void;
  onCancel: () => void;
}

export const TableEditor: React.FC<TableEditorProps> = ({ table, allTables, onSave, onCancel }) => {
  const [editedTable, setEditedTable] = useState<Table>(table);

  const addColumn = () => {
    const newColumn: Column = {
      name: 'new_column',
      type: 'VARCHAR(255)',
      nullable: true,
      unique: false,
      primaryKey: false,
    };
    setEditedTable({
      ...editedTable,
      columns: [...editedTable.columns, newColumn],
    });
  };

  const updateColumn = (index: number, field: keyof Column, value: any) => {
    const newColumns = [...editedTable.columns];
    newColumns[index] = { ...newColumns[index], [field]: value };
    setEditedTable({ ...editedTable, columns: newColumns });
  };

  const deleteColumn = (index: number) => {
    setEditedTable({
      ...editedTable,
      columns: editedTable.columns.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Table</h2>
              <Input
                value={editedTable.name}
                onChange={(e) => setEditedTable({ ...editedTable, name: e.target.value })}
                className="mt-2 font-mono text-sm"
                placeholder="Table name"
              />
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Columns List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {editedTable.columns.map((column, index) => (
              <div
                key={index}
                className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="grid grid-cols-12 gap-3 items-start">
                  {/* Column Name */}
                  <div className="col-span-3">
                    <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                      Column Name
                    </label>
                    <Input
                      value={column.name}
                      onChange={(e) => updateColumn(index, 'name', e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>

                  {/* Data Type */}
                  <div className="col-span-3">
                    <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                      Data Type
                    </label>
                    <Input
                      value={column.type}
                      onChange={(e) => updateColumn(index, 'type', e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>

                  {/* Checkboxes */}
                  <div className="col-span-5 flex items-end gap-4 pb-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={column.primaryKey}
                        onChange={(e) => {
                          updateColumn(index, 'primaryKey', e.target.checked);
                          if (e.target.checked) {
                            updateColumn(index, 'nullable', false);
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-gray-700 dark:text-gray-300">PK</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!column.nullable}
                        onChange={(e) => updateColumn(index, 'nullable', !e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-gray-700 dark:text-gray-300">NOT NULL</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={column.unique}
                        onChange={(e) => updateColumn(index, 'unique', e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-gray-700 dark:text-gray-300">UNIQUE</span>
                    </label>
                  </div>

                  {/* Delete Button */}
                  <div className="col-span-1 flex items-end justify-end pb-2">
                    <button
                      onClick={() => deleteColumn(index)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Foreign Key Reference */}
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Link className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Foreign Key Reference</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                        References Table
                      </label>
                      <select
                        value={column.references?.table || ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            updateColumn(index, 'references', {
                              table: e.target.value,
                              column: column.references?.column || '',
                            });
                          } else {
                            updateColumn(index, 'references', undefined);
                          }
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">None</option>
                        {allTables.filter(t => t.name !== editedTable.name).map(t => (
                          <option key={t.name} value={t.name}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                        References Column
                      </label>
                      <select
                        value={column.references?.column || ''}
                        onChange={(e) => {
                          if (column.references) {
                            updateColumn(index, 'references', {
                              ...column.references,
                              column: e.target.value,
                            });
                          }
                        }}
                        disabled={!column.references?.table}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Select column</option>
                        {column.references?.table && allTables
                          .find(t => t.name === column.references!.table)
                          ?.columns.filter(c => c.primaryKey || c.unique)
                          .map(c => (
                            <option key={c.name} value={c.name}>{c.name}</option>
                          ))}
                      </select>
                    </div>
                  </div>
                  {column.references?.table && column.references?.column && (
                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-800 dark:text-blue-300">
                      FK: {column.name} → {column.references.table}.{column.references.column}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={addColumn}
            className="w-full mt-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Column
          </Button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onSave(editedTable)}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};
