import React, { useState } from 'react';
import { Card, Button, Input, Select, CodeBlock } from '../common';
import { Database, Check, X, Play } from 'lucide-react';
import { useNotificationStore } from '../../stores';

interface ConnectionConfig {
  type: 'postgresql' | 'mysql' | 'mongodb' | 'sqlserver';
  host: string;
  port: string;
  username: string;
  password: string;
  database: string;
  ssl?: boolean;
}

interface TableInfo {
  name: string;
  columns: number;
  rows?: number;
}

export const DatabaseConnection: React.FC = () => {
  const { addNotification } = useNotificationStore();
  const [config, setConfig] = useState<ConnectionConfig>({
    type: 'postgresql',
    host: 'localhost',
    port: '5432',
    username: 'admin',
    password: '',
    database: 'mydb',
    ssl: false
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [queryResult, setQueryResult] = useState<string>('');
  const [customQuery, setCustomQuery] = useState<string>('');

  const defaultPorts: Record<string, string> = {
    postgresql: '5432',
    mysql: '3306',
    mongodb: '27017',
    sqlserver: '1433'
  };

  const handleDatabaseTypeChange = (type: string) => {
    setConfig({
      ...config,
      type: type as ConnectionConfig['type'],
      port: defaultPorts[type]
    });
  };

  const getConnectionString = (): string => {
    const { type, username, password, host, port, database, ssl } = config;
    
    switch (type) {
      case 'postgresql':
        return `postgresql://${username}:${password}@${host}:${port}/${database}${ssl ? '?sslmode=require' : ''}`;
      case 'mysql':
        return `mysql://${username}:${password}@${host}:${port}/${database}${ssl ? '?ssl=true' : ''}`;
      case 'mongodb':
        return `mongodb://${username}:${password}@${host}:${port}/${database}${ssl ? '?ssl=true' : ''}`;
      case 'sqlserver':
        return `sqlserver://${username}:${password}@${host}:${port}/${database}${ssl ? '?encrypt=true' : ''}`;
      default:
        return '';
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    
    // Simulate connection attempt
    setTimeout(() => {
      // In a real implementation, this would make an API call to the backend
      // which would attempt to connect to the database
      try {
        // Simulate successful connection
        setIsConnected(true);
        
        // Simulate fetching tables
        const mockTables: TableInfo[] = [
          { name: 'users', columns: 8, rows: 150 },
          { name: 'products', columns: 12, rows: 523 },
          { name: 'orders', columns: 10, rows: 1240 },
          { name: 'categories', columns: 5, rows: 25 }
        ];
        setTables(mockTables);
        
        addNotification({
          type: 'success',
          title: 'Connected',
          message: 'Successfully connected to database!'
        });
      } catch (error) {
        addNotification({
          type: 'error',
          title: 'Error',
          message: 'Failed to connect to database'
        });
      } finally {
        setIsConnecting(false);
      }
    }, 1500);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setTables([]);
    setSelectedTable('');
    setQueryResult('');
    addNotification({
      type: 'info',
      title: 'Disconnected',
      message: 'Disconnected from database'
    });
  };

  const handleExecuteQuery = () => {
    // In a real implementation, this would execute the query on the backend
    const mockResult = {
      rows: [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
        { id: 3, name: 'Bob Johnson', email: 'bob@example.com' }
      ],
      rowCount: 3,
      executionTime: '12ms'
    };

    setQueryResult(JSON.stringify(mockResult, null, 2));
    addNotification({
      type: 'success',
      title: 'Query Executed',
      message: `Query executed successfully (${mockResult.rowCount} rows, ${mockResult.executionTime})`
    });
  };

  const handleInspectTable = (tableName: string) => {
    setSelectedTable(tableName);
    setCustomQuery(`SELECT * FROM ${tableName} LIMIT 10;`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Database className="w-6 h-6 text-blue-600" />
          Live Database Connection
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Select
            label="Database Type"
            value={config.type}
            onChange={(e) => handleDatabaseTypeChange(e.target.value)}
            options={[
              { value: 'postgresql', label: 'PostgreSQL' },
              { value: 'mysql', label: 'MySQL' },
              { value: 'mongodb', label: 'MongoDB' },
              { value: 'sqlserver', label: 'SQL Server' }
            ]}
          />

          <Input
            label="Host"
            value={config.host}
            onChange={(e) => setConfig({ ...config, host: e.target.value })}
            placeholder="localhost"
          />

          <Input
            label="Port"
            value={config.port}
            onChange={(e) => setConfig({ ...config, port: e.target.value })}
            placeholder={defaultPorts[config.type]}
          />

          <Input
            label="Database Name"
            value={config.database}
            onChange={(e) => setConfig({ ...config, database: e.target.value })}
            placeholder="mydb"
          />

          <Input
            label="Username"
            value={config.username}
            onChange={(e) => setConfig({ ...config, username: e.target.value })}
            placeholder="admin"
          />

          <Input
            label="Password"
            type="password"
            value={config.password}
            onChange={(e) => setConfig({ ...config, password: e.target.value })}
            placeholder="••••••••"
          />

          <div className="md:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.ssl || false}
                onChange={(e) => setConfig({ ...config, ssl: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Use SSL/TLS Connection</span>
            </label>
          </div>
        </div>

        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Connection String</h4>
          <code className="text-xs text-gray-600 dark:text-gray-400 break-all">
            {getConnectionString()}
          </code>
        </div>

        <div className="flex gap-2">
          {!isConnected ? (
            <Button
              onClick={handleConnect}
              isLoading={isConnecting}
              className="flex-1"
            >
              <Database className="w-4 h-4 mr-2" />
              Connect to Database
            </Button>
          ) : (
            <Button
              onClick={handleDisconnect}
              variant="secondary"
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          )}
        </div>

        {isConnected && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-700 dark:text-green-300">
              Connected to {config.type} database at {config.host}:{config.port}
            </span>
          </div>
        )}
      </Card>

      {isConnected && tables.length > 0 && (
        <>
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Database Tables ({tables.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tables.map((table) => (
                <div
                  key={table.name}
                  className={`p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                    selectedTable === table.name
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                  }`}
                  onClick={() => handleInspectTable(table.name)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">{table.name}</h4>
                    <Database className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <div>{table.columns} columns</div>
                    {table.rows !== undefined && <div>{table.rows.toLocaleString()} rows</div>}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Query Editor
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  SQL Query
                </label>
                <textarea
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm"
                  placeholder="Enter your SQL query here..."
                />
              </div>

              <Button onClick={handleExecuteQuery} disabled={!customQuery.trim()}>
                <Play className="w-4 h-4 mr-2" />
                Execute Query
              </Button>

              {queryResult && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Results</h4>
                  <CodeBlock
                    code={queryResult}
                    language="json"
                    maxHeight="300px"
                  />
                </div>
              )}
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              ⚠️ Important Notes
            </h3>
            <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="font-medium text-yellow-900 dark:text-yellow-300 mb-1">
                  Security Notice
                </p>
                <p className="text-yellow-800 dark:text-yellow-400">
                  This is a demonstration feature. In a production environment, never store database credentials
                  in the frontend. Always use a secure backend API with proper authentication.
                </p>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="font-medium text-blue-900 dark:text-blue-300 mb-1">
                  Backend Required
                </p>
                <p className="text-blue-800 dark:text-blue-400">
                  To enable live database connections, implement a backend API endpoint that handles
                  database connections securely and returns results to the frontend.
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
