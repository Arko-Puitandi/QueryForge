import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, Sparkles, X } from 'lucide-react';
import { Button, Card } from '../common';

interface SchemaUploaderProps {
  onSchemaUpload: (schema: any, metadata: { filename: string; type: string }) => void;
  onOptimize?: (schema: any) => void;
}

export const SchemaUploader: React.FC<SchemaUploaderProps> = ({ onSchemaUpload, onOptimize }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedSchema, setParsedSchema] = useState<any>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [optimizationSuggestions, setOptimizationSuggestions] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supportedFormats = [
    { ext: '.sql', description: 'SQL DDL Schema' },
    { ext: '.json', description: 'JSON Schema' },
    { ext: '.xml', description: 'XML Schema' },
    { ext: '.yaml/.yml', description: 'YAML Schema' },
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setUploadedFile(file);
    setParseError(null);
    setParsedSchema(null);
    setOptimizationSuggestions([]);

    try {
      const text = await file.text();
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      let parsed: any;

      switch (fileExt) {
        case 'json':
          parsed = parseJSONSchema(text);
          break;
        case 'sql':
          parsed = parseSQLSchema(text);
          break;
        case 'yaml':
        case 'yml':
          parsed = parseYAMLSchema(text);
          break;
        case 'xml':
          parsed = parseXMLSchema(text);
          break;
        default:
          throw new Error(`Unsupported file format: ${fileExt}`);
      }

      setParsedSchema(parsed);
      
      // Generate optimization suggestions
      const suggestions = generateOptimizationSuggestions(parsed);
      setOptimizationSuggestions(suggestions);

      // Notify parent component
      onSchemaUpload(parsed, { filename: file.name, type: fileExt || 'unknown' });
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Failed to parse schema file');
    }
  };

  const parseJSONSchema = (text: string): any => {
    try {
      const json = JSON.parse(text);
      
      // Check if it's our internal schema format
      if (json.tables && Array.isArray(json.tables)) {
        return json;
      }
      
      // Try to convert from other JSON schema formats
      return convertToInternalSchema(json);
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  };

  const parseSQLSchema = (text: string): any => {
    const tables: any[] = [];
    const lines = text.split('\n');
    let currentTable: any = null;

    for (const line of lines) {
      const trimmed = line.trim();
      
      // CREATE TABLE detection
      const createMatch = trimmed.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?/i);
      if (createMatch) {
        if (currentTable) tables.push(currentTable);
        currentTable = {
          name: createMatch[1],
          columns: [],
          indexes: [],
        };
        continue;
      }

      // Column definition
      if (currentTable && !trimmed.startsWith('--') && !trimmed.startsWith('/*')) {
        const columnMatch = trimmed.match(/^`?(\w+)`?\s+(\w+(?:\(\d+(?:,\d+)?\))?)/i);
        if (columnMatch) {
          const column: any = {
            name: columnMatch[1],
            type: columnMatch[2].toUpperCase(),
            nullable: !trimmed.includes('NOT NULL'),
            primaryKey: trimmed.includes('PRIMARY KEY'),
            unique: trimmed.includes('UNIQUE'),
            autoIncrement: trimmed.includes('AUTO_INCREMENT') || trimmed.includes('AUTOINCREMENT'),
          };

          // Extract default value
          const defaultMatch = trimmed.match(/DEFAULT\s+('.*?'|\d+|NULL|TRUE|FALSE)/i);
          if (defaultMatch) {
            column.defaultValue = defaultMatch[1];
          }

          currentTable.columns.push(column);
        }

        // Foreign key
        const fkMatch = trimmed.match(/FOREIGN\s+KEY\s*\(`?(\w+)`?\)\s*REFERENCES\s+`?(\w+)`?\s*\(`?(\w+)`?\)/i);
        if (fkMatch) {
          const colIndex = currentTable.columns.findIndex((c: any) => c.name === fkMatch[1]);
          if (colIndex !== -1) {
            currentTable.columns[colIndex].references = {
              table: fkMatch[2],
              column: fkMatch[3],
            };
          }
        }
      }

      // End of table
      if (trimmed === ');' && currentTable) {
        tables.push(currentTable);
        currentTable = null;
      }
    }

    if (currentTable) tables.push(currentTable);

    return {
      name: 'imported_schema',
      databaseType: 'postgresql',
      tables,
    };
  };

  const parseYAMLSchema = (text: string): any => {
    // Simple YAML parser (for basic structures)
    // In production, use a library like js-yaml
    try {
      const lines = text.split('\n');
      const schema: any = { tables: [] };
      let currentTable: any = null;
      
      for (const line of lines) {
        if (line.trim().startsWith('- name:')) {
          if (currentTable) schema.tables.push(currentTable);
          currentTable = { name: line.split(':')[1].trim(), columns: [] };
        } else if (line.includes('columns:')) {
          // Parse columns section
        }
      }
      
      if (currentTable) schema.tables.push(currentTable);
      return schema;
    } catch (error) {
      throw new Error('Invalid YAML format');
    }
  };

  const parseXMLSchema = (text: string): any => {
    // Basic XML parsing (in production, use DOMParser)
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/xml');
    
    if (doc.querySelector('parsererror')) {
      throw new Error('Invalid XML format');
    }

    const tables: any[] = [];
    const tableNodes = doc.querySelectorAll('table');
    
    tableNodes.forEach(tableNode => {
      const table: any = {
        name: tableNode.getAttribute('name') || 'unknown',
        columns: [],
      };

      const columnNodes = tableNode.querySelectorAll('column');
      columnNodes.forEach(colNode => {
        table.columns.push({
          name: colNode.getAttribute('name'),
          type: colNode.getAttribute('type'),
          nullable: colNode.getAttribute('nullable') === 'true',
          primaryKey: colNode.getAttribute('primaryKey') === 'true',
        });
      });

      tables.push(table);
    });

    return { name: 'imported_schema', databaseType: 'postgresql', tables };
  };

  const convertToInternalSchema = (external: any): any => {
    // Convert from other schema formats to our internal format
    // This is a placeholder - implement based on common schema formats
    return {
      name: external.name || 'imported_schema',
      databaseType: external.database || 'postgresql',
      tables: external.tables || [],
    };
  };

  const generateOptimizationSuggestions = (schema: any): string[] => {
    const suggestions: string[] = [];

    if (!schema.tables || schema.tables.length === 0) {
      return suggestions;
    }

    for (const table of schema.tables) {
      // Check for missing primary keys
      const hasPrimaryKey = table.columns?.some((col: any) => col.primaryKey);
      if (!hasPrimaryKey) {
        suggestions.push(`Table '${table.name}' is missing a primary key`);
      }

      // Check for missing indexes on foreign keys
      const foreignKeys = table.columns?.filter((col: any) => col.references);
      if (foreignKeys?.length > 0) {
        const hasIndex = table.indexes?.some((idx: any) => 
          foreignKeys.some((fk: any) => idx.columns.includes(fk.name))
        );
        if (!hasIndex) {
          suggestions.push(`Consider adding indexes on foreign keys in '${table.name}'`);
        }
      }

      // Check for VARCHAR without length
      const varcharCols = table.columns?.filter((col: any) => 
        col.type.toUpperCase().includes('VARCHAR') && !col.type.includes('(')
      );
      if (varcharCols?.length > 0) {
        suggestions.push(`Specify length for VARCHAR columns in '${table.name}'`);
      }

      // Check for missing timestamps
      const hasTimestamps = table.columns?.some((col: any) => 
        col.name.toLowerCase().includes('created') || col.name.toLowerCase().includes('updated')
      );
      if (!hasTimestamps) {
        suggestions.push(`Consider adding created_at/updated_at timestamps to '${table.name}'`);
      }

      // Check for text fields that should be indexed
      const searchableTextCols = table.columns?.filter((col: any) => 
        (col.type.toUpperCase().includes('TEXT') || col.type.toUpperCase().includes('VARCHAR')) &&
        (col.name.toLowerCase().includes('name') || col.name.toLowerCase().includes('title'))
      );
      if (searchableTextCols?.length > 0 && !table.indexes?.length) {
        suggestions.push(`Add indexes on searchable text columns in '${table.name}'`);
      }
    }

    return suggestions;
  };

  const handleOptimize = () => {
    if (parsedSchema && onOptimize) {
      onOptimize(parsedSchema);
    }
  };

  const handleClear = () => {
    setUploadedFile(null);
    setParsedSchema(null);
    setParseError(null);
    setOptimizationSuggestions([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".sql,.json,.xml,.yaml,.yml"
          onChange={handleChange}
        />

        {!uploadedFile ? (
          <div className="space-y-4">
            <Upload className="w-12 h-12 mx-auto text-gray-400" />
            <div>
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Drop your schema file here, or{' '}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-500 hover:text-blue-600 underline"
                >
                  browse
                </button>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Supports SQL, JSON, XML, and YAML formats
              </p>
            </div>

            {/* Supported Formats */}
            <div className="mt-4 grid grid-cols-2 gap-2 max-w-md mx-auto">
              {supportedFormats.map((format, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400"
                >
                  <FileText className="w-3 h-3" />
                  <span className="font-medium">{format.ext}</span>
                  <span className="text-gray-400">- {format.description}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <FileText className="w-8 h-8 text-blue-500" />
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-white">{uploadedFile.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {(uploadedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="ml-4 p-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {parsedSchema && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">
                  Successfully parsed {parsedSchema.tables?.length || 0} table(s)
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Parse Error */}
      {parseError && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <div>
            <p className="font-medium text-red-800 dark:text-red-200">Failed to parse schema</p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">{parseError}</p>
          </div>
        </div>
      )}

      {/* Optimization Suggestions */}
      {optimizationSuggestions.length > 0 && (
        <Card title="Optimization Suggestions" className="bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
          <div className="space-y-2">
            {optimizationSuggestions.map((suggestion, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-amber-800 dark:text-amber-200">{suggestion}</p>
              </div>
            ))}
          </div>

          {onOptimize && (
            <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-800">
              <Button
                onClick={handleOptimize}
                variant="primary"
                className="w-full"
              >
                <Sparkles className="w-4 h-4" />
                Apply AI Optimization
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Schema Preview */}
      {parsedSchema && (
        <Card title="Schema Preview">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Database: {parsedSchema.databaseType || 'Unknown'}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {parsedSchema.tables?.length || 0} tables
              </span>
            </div>
            
            <div className="max-h-64 overflow-y-auto space-y-2">
              {parsedSchema.tables?.map((table: any, index: number) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <p className="font-medium text-gray-900 dark:text-white">{table.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {table.columns?.length || 0} columns
                    {table.indexes?.length > 0 && `, ${table.indexes.length} indexes`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
