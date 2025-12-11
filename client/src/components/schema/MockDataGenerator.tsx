import React, { useState, useEffect } from 'react';
import { Card, Button } from '../common';
import { Download, RefreshCw } from 'lucide-react';
import { Table } from '../../types';

interface MockDataGeneratorProps {
  tables: Table[];
  onDataGenerated?: (data: Record<string, any[]>) => void;
}

export const MockDataGenerator: React.FC<MockDataGeneratorProps> = ({
  tables,
  onDataGenerated,
}) => {
  const [rowCount, setRowCount] = useState(10);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [generatedData, setGeneratedData] = useState<Record<string, any[]>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (tables.length > 0) {
      setSelectedTables(tables.map(t => t.name));
    }
  }, [tables]);

  const generateMockValue = (columnName: string, columnType: string): any => {
    const lowerName = columnName.toLowerCase();
    const lowerType = columnType.toLowerCase();

    // ID fields
    if (lowerName === 'id' || lowerName.endsWith('_id')) {
      return Math.floor(Math.random() * 10000) + 1;
    }

    // Email
    if (lowerName.includes('email')) {
      return `user${Math.floor(Math.random() * 1000)}@example.com`;
    }

    // Name fields
    if (lowerName.includes('name')) {
      const firstNames = ['John', 'Jane', 'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'];
      const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller'];
      if (lowerName.includes('first')) return firstNames[Math.floor(Math.random() * firstNames.length)];
      if (lowerName.includes('last')) return lastNames[Math.floor(Math.random() * lastNames.length)];
      return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    }

    // Phone
    if (lowerName.includes('phone')) {
      return `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
    }

    // Address
    if (lowerName.includes('address')) {
      return `${Math.floor(Math.random() * 9999) + 1} Main St`;
    }

    // City
    if (lowerName.includes('city')) {
      const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia'];
      return cities[Math.floor(Math.random() * cities.length)];
    }

    // Country
    if (lowerName.includes('country')) {
      const countries = ['USA', 'Canada', 'UK', 'Germany', 'France', 'Japan'];
      return countries[Math.floor(Math.random() * countries.length)];
    }

    // Price/Amount
    if (lowerName.includes('price') || lowerName.includes('amount') || lowerName.includes('cost')) {
      return (Math.random() * 1000).toFixed(2);
    }

    // Date fields
    if (lowerName.includes('date') || lowerName.includes('created_at') || lowerName.includes('updated_at')) {
      const start = new Date(2023, 0, 1);
      const end = new Date();
      return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
    }

    // Boolean
    if (lowerName.includes('is_') || lowerName.includes('has_') || lowerType.includes('bool')) {
      return Math.random() > 0.5;
    }

    // Type-based generation
    if (lowerType.includes('int') || lowerType.includes('number')) {
      return Math.floor(Math.random() * 1000);
    }

    if (lowerType.includes('decimal') || lowerType.includes('float') || lowerType.includes('double')) {
      return (Math.random() * 1000).toFixed(2);
    }

    if (lowerType.includes('varchar') || lowerType.includes('text') || lowerType.includes('string')) {
      return `Sample ${columnName} ${Math.floor(Math.random() * 100)}`;
    }

    return 'N/A';
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      const data: Record<string, any[]> = {};

      selectedTables.forEach(tableName => {
        const table = tables.find(t => t.name === tableName);
        if (!table) return;

        const rows = [];
        for (let i = 0; i < rowCount; i++) {
          const row: Record<string, any> = {};
          table.columns.forEach(column => {
            row[column.name] = generateMockValue(column.name, column.type);
          });
          rows.push(row);
        }
        data[tableName] = rows;
      });

      setGeneratedData(data);
      onDataGenerated?.(data);
      setIsGenerating(false);
    }, 500);
  };

  const handleDownloadJSON = () => {
    const json = JSON.stringify(generatedData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mock-data-${Date.now()}.json`;
    a.click();
  };

  const handleDownloadSQL = () => {
    let sql = '';
    
    Object.entries(generatedData).forEach(([tableName, rows]) => {
      rows.forEach(row => {
        const columns = Object.keys(row).join(', ');
        const values = Object.values(row)
          .map(v => {
            if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
            if (typeof v === 'boolean') return v ? '1' : '0';
            if (v === null) return 'NULL';
            return v;
          })
          .join(', ');
        sql += `INSERT INTO ${tableName} (${columns}) VALUES (${values});\n`;
      });
      sql += '\n';
    });

    const blob = new Blob([sql], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mock-data-${Date.now()}.sql`;
    a.click();
  };

  const handleDownloadCSV = () => {
    Object.entries(generatedData).forEach(([tableName, rows]) => {
      if (rows.length === 0) return;

      const headers = Object.keys(rows[0]);
      let csv = headers.join(',') + '\n';
      
      rows.forEach(row => {
        const values = headers.map(header => {
          const value = row[header];
          if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
          return value;
        });
        csv += values.join(',') + '\n';
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tableName}-${Date.now()}.csv`;
      a.click();
    });
  };

  return (
    <Card>
      <div className="space-y-4">
        {/* Configuration */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Number of Rows
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              value={rowCount}
              onChange={e => setRowCount(parseInt(e.target.value) || 10)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Table Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Tables
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3">
            {tables.map(table => (
              <label key={table.name} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTables.includes(table.name)}
                  onChange={e => {
                    if (e.target.checked) {
                      setSelectedTables([...selectedTables, table.name]);
                    } else {
                      setSelectedTables(selectedTables.filter(t => t !== table.name));
                    }
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{table.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          isLoading={isGenerating}
          disabled={selectedTables.length === 0}
          className="w-full"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Generate Mock Data
        </Button>

        {/* Results */}
        {Object.keys(generatedData).length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Generated {Object.values(generatedData).reduce((sum, rows) => sum + rows.length, 0)} rows across {Object.keys(generatedData).length} tables
              </span>
            </div>

            {/* Download Options */}
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={handleDownloadJSON}>
                <Download className="w-4 h-4 mr-1" />
                JSON
              </Button>
              <Button size="sm" variant="secondary" onClick={handleDownloadSQL}>
                <Download className="w-4 h-4 mr-1" />
                SQL
              </Button>
              <Button size="sm" variant="secondary" onClick={handleDownloadCSV}>
                <Download className="w-4 h-4 mr-1" />
                CSV
              </Button>
            </div>

            {/* Preview */}
            <div className="max-h-64 overflow-auto border border-gray-300 dark:border-gray-600 rounded-lg">
              {Object.entries(generatedData).map(([tableName, rows]) => (
                <div key={tableName} className="p-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    {tableName} ({rows.length} rows)
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    {rows.slice(0, 3).map((row, idx) => (
                      <div key={idx} className="font-mono">
                        {JSON.stringify(row).substring(0, 100)}...
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
