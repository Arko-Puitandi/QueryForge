import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../common';
import { Table } from '../../types';
import { Plus, Edit2, Trash2, Database, Link, ZoomIn, ZoomOut, Move, Grid, Maximize, Download, Layout, Search, ChevronLeft, ChevronRight, CheckCircle, AlertCircle, HelpCircle, Keyboard } from 'lucide-react';
import { TableEditor } from './TableEditor';
import { validateDesignerSchema, exportDiagram } from '../../services/api';

interface TablePosition {
  x: number;
  y: number;
}

interface VisualSchemaDesignerProps {
  tables: Table[];
  onTablesChange: (tables: Table[]) => void;
  initialPositions?: Record<string, TablePosition>;
  onPositionsChange?: (positions: Record<string, TablePosition>) => void;
}

const TABLE_COLORS = [
  { header: 'bg-gradient-to-r from-purple-500 to-purple-600', text: 'text-white' },
  { header: 'bg-gradient-to-r from-blue-500 to-blue-600', text: 'text-white' },
  { header: 'bg-gradient-to-r from-green-500 to-green-600', text: 'text-white' },
  { header: 'bg-gradient-to-r from-orange-500 to-orange-600', text: 'text-white' },
  { header: 'bg-gradient-to-r from-pink-500 to-pink-600', text: 'text-white' },
  { header: 'bg-gradient-to-r from-indigo-500 to-indigo-600', text: 'text-white' },
  { header: 'bg-gradient-to-r from-teal-500 to-teal-600', text: 'text-white' },
  { header: 'bg-gradient-to-r from-red-500 to-red-600', text: 'text-white' },
  { header: 'bg-gradient-to-r from-cyan-500 to-cyan-600', text: 'text-white' },
  { header: 'bg-gradient-to-r from-amber-500 to-amber-600', text: 'text-white' },
];

export const VisualSchemaDesigner: React.FC<VisualSchemaDesignerProps> = ({
  tables,
  onTablesChange,
  initialPositions = {},
  onPositionsChange,
}) => {
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [showRelationships, setShowRelationships] = useState(true);
  const [tablePositions, setTablePositions] = useState<Record<string, TablePosition>>(initialPositions);
  const [draggingTable, setDraggingTable] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.6);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [showRelationshipPanel, setShowRelationshipPanel] = useState(false);
  const [showConstraintsPanel, setShowConstraintsPanel] = useState(false);
  const [creatingRelationship, setCreatingRelationship] = useState<{
    fromTable: string;
    fromColumn: string;
  } | null>(null);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    issues: Array<{ type: string; message: string; table?: string; column?: string }>;
    summary: { errors: number; warnings: number; info: number };
  } | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ tableName: string } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const TABLE_TEMPLATES = [
    {
      name: 'User Authentication',
      tables: [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'BIGINT', primaryKey: true, nullable: false, unique: false },
            { name: 'email', type: 'VARCHAR(255)', primaryKey: false, nullable: false, unique: true },
            { name: 'password_hash', type: 'VARCHAR(255)', primaryKey: false, nullable: false, unique: false },
            { name: 'created_at', type: 'TIMESTAMP', primaryKey: false, nullable: false, unique: false },
          ],
          primaryKey: ['id'],
          indexes: [{ name: 'idx_users_email', columns: ['email'] }],
        },
      ],
    },
    {
      name: 'E-commerce Product',
      tables: [
        {
          name: 'products',
          columns: [
            { name: 'id', type: 'BIGINT', primaryKey: true, nullable: false, unique: false },
            { name: 'name', type: 'VARCHAR(255)', primaryKey: false, nullable: false, unique: false },
            { name: 'price', type: 'DECIMAL(10,2)', primaryKey: false, nullable: false, unique: false },
            { name: 'stock', type: 'INT', primaryKey: false, nullable: false, unique: false },
            { name: 'category_id', type: 'BIGINT', primaryKey: false, nullable: true, unique: false },
          ],
          primaryKey: ['id'],
          indexes: [{ name: 'idx_products_category', columns: ['category_id'] }],
        },
      ],
    },
    {
      name: 'Blog Post',
      tables: [
        {
          name: 'posts',
          columns: [
            { name: 'id', type: 'BIGINT', primaryKey: true, nullable: false, unique: false },
            { name: 'title', type: 'VARCHAR(255)', primaryKey: false, nullable: false, unique: false },
            { name: 'content', type: 'TEXT', primaryKey: false, nullable: false, unique: false },
            { name: 'author_id', type: 'BIGINT', primaryKey: false, nullable: false, unique: false },
            { name: 'published_at', type: 'TIMESTAMP', primaryKey: false, nullable: true, unique: false },
          ],
          primaryKey: ['id'],
          indexes: [{ name: 'idx_posts_author', columns: ['author_id'] }],
        },
      ],
    },
    {
      name: 'Order Management',
      tables: [
        {
          name: 'orders',
          columns: [
            { name: 'id', type: 'BIGINT', primaryKey: true, nullable: false, unique: false },
            { name: 'user_id', type: 'BIGINT', primaryKey: false, nullable: false, unique: false },
            { name: 'total_amount', type: 'DECIMAL(10,2)', primaryKey: false, nullable: false, unique: false },
            { name: 'status', type: 'VARCHAR(50)', primaryKey: false, nullable: false, unique: false },
            { name: 'created_at', type: 'TIMESTAMP', primaryKey: false, nullable: false, unique: false },
          ],
          primaryKey: ['id'],
          indexes: [{ name: 'idx_orders_user', columns: ['user_id'] }],
        },
      ],
    },
  ];

  // Initialize table positions in a grid layout with proper spacing
  useEffect(() => {
    if (tables.length === 0) return;
    
    const currentPositionCount = Object.keys(tablePositions).length;
    const missingTables = tables.filter(table => !tablePositions[table.name]);
    
    if (missingTables.length > 0) {
      const positions: Record<string, TablePosition> = { ...tablePositions };
      const cols = Math.ceil(Math.sqrt(tables.length));
      const spacing = 400;
      
      missingTables.forEach((table) => {
        const index = tables.findIndex(t => t.name === table.name);
        const row = Math.floor(index / cols);
        const col = index % cols;
        positions[table.name] = {
          x: 50 + col * spacing,
          y: 50 + row * spacing,
        };
      });
      
      setTablePositions(positions);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.length, tables.map(t => t.name).join(',')]);

  // Notify parent of position changes
  useEffect(() => {
    if (onPositionsChange && Object.keys(tablePositions).length > 0) {
      onPositionsChange(tablePositions);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablePositions]);

  // Calculate dynamic canvas size based on table positions
  const getCanvasSize = () => {
    if (tables.length === 0) {
      return { width: 1200, height: 800 }; // Default size for empty canvas
    }

    let maxX = 0;
    let maxY = 0;

    tables.forEach(table => {
      const pos = tablePositions[table.name];
      if (pos) {
        maxX = Math.max(maxX, pos.x + 400); // 400 is approx table width
        maxY = Math.max(maxY, pos.y + 300); // 300 is approx table height
      }
    });

    // Add padding around the content
    const padding = 200;
    const width = Math.max(1200, maxX + padding);
    const height = Math.max(800, maxY + padding);

    return { width, height };
  };

  const canvasSize = getCanvasSize();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl/Cmd + Plus/Equals = Zoom In
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        handleZoomIn();
      }
      // Ctrl/Cmd + Minus = Zoom Out
      else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      }
      // Ctrl/Cmd + 0 = Reset Zoom
      else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      }
      // Ctrl/Cmd + A = Add Table
      else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        handleAddTable();
      }
      // Ctrl/Cmd + L = Auto Layout
      else if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        handleAutoLayout();
      }
      // Ctrl/Cmd + F = Fit to Screen
      else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        handleFitToScreen();
      }
      // Delete key = Delete selected table
      else if (e.key === 'Delete' && selectedTable) {
        e.preventDefault();
        handleDeleteTable(selectedTable);
      }
      // ? key = Show keyboard shortcuts
      else if (e.key === '?' && !showKeyboardHelp) {
        e.preventDefault();
        setShowKeyboardHelp(true);
      }
      // Escape key = Close modals
      else if (e.key === 'Escape') {
        if (showKeyboardHelp) {
          setShowKeyboardHelp(false);
        } else if (showTemplates) {
          setShowTemplates(false);
        } else if (showValidation) {
          setShowValidation(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [zoom, selectedTable, tables, showKeyboardHelp, showTemplates, showValidation]);


  const handleAddTable = () => {
    const newTable: Table = {
      name: `table_${tables.length + 1}`,
      columns: [
        {
          name: 'id',
          type: 'BIGINT',
          primaryKey: true,
          nullable: false,
          unique: false,
        },
      ],
      primaryKey: ['id'],
      indexes: [],
    };
    
    // Random scatter positioning (within viewport)
    const randomX = Math.floor(Math.random() * 800) + 100;
    const randomY = Math.floor(Math.random() * 600) + 100;
    
    setTablePositions({
      ...tablePositions,
      [newTable.name]: {
        x: randomX,
        y: randomY,
      },
    });
    
    onTablesChange([...tables, newTable]);
  };

  const handleAddFromTemplate = (template: typeof TABLE_TEMPLATES[0]) => {
    const existingNames = new Set(tables.map(t => t.name));
    const newTables = template.tables.map(table => {
      let tableName = table.name;
      let counter = 1;
      while (existingNames.has(tableName)) {
        tableName = `${table.name}_${counter}`;
        counter++;
      }
      return { 
        ...table, 
        name: tableName,
        indexes: table.indexes?.map(idx => ({ ...idx, unique: false })) || []
      };
    });

    // Position new tables randomly
    const newPositions = { ...tablePositions };
    newTables.forEach((table) => {
      const randomX = Math.floor(Math.random() * 800) + 100;
      const randomY = Math.floor(Math.random() * 600) + 100;
      newPositions[table.name] = { x: randomX, y: randomY };
    });

    setTablePositions(newPositions);
    onTablesChange([...tables, ...newTables]);
    setShowTemplates(false);
  };

  const handleEditTable = (table: Table) => {
    setEditingTable(table);
  };

  const handleSaveTable = (updatedTable: Table) => {
    const newTables = tables.map(t => 
      t.name === editingTable?.name ? updatedTable : t
    );
    onTablesChange(newTables);
    setEditingTable(null);
  };

  const handleDeleteTable = (tableName: string) => {
    setDeleteConfirmation({ tableName });
  };

  const confirmDeleteTable = () => {
    if (!deleteConfirmation) return;
    const { tableName } = deleteConfirmation;
    const newPositions = { ...tablePositions };
    delete newPositions[tableName];
    setTablePositions(newPositions);
    onTablesChange(tables.filter(t => t.name !== tableName));
    setDeleteConfirmation(null);
  };

  const cancelDeleteTable = () => {
    setDeleteConfirmation(null);
  };

  const handleStartRelationship = (tableName: string, columnName: string) => {
    setCreatingRelationship({ fromTable: tableName, fromColumn: columnName });
  };

  const handleCompleteRelationship = (toTable: string, toColumn: string) => {
    if (!creatingRelationship) return;

    const fromTable = tables.find(t => t.name === creatingRelationship.fromTable);
    if (!fromTable) return;

    const updatedTables = tables.map(table => {
      if (table.name === creatingRelationship.fromTable) {
        const updatedColumns = table.columns.map(col => {
          if (col.name === creatingRelationship.fromColumn) {
            return {
              ...col,
              references: {
                table: toTable,
                column: toColumn,
              },
            };
          }
          return col;
        });
        return { ...table, columns: updatedColumns };
      }
      return table;
    });

    onTablesChange(updatedTables);
    setCreatingRelationship(null);
  };

  const handleCancelRelationship = () => {
    setCreatingRelationship(null);
  };

  const handleValidateSchema = async () => {
    setIsValidating(true);
    try {
      const schema = { tables };
      const response = await validateDesignerSchema(schema);
      if (response.success && response.data) {
        setValidationResult(response.data);
        setShowValidation(true);
      }
    } catch (error) {
      console.error('Validation failed:', error);
      alert('Failed to validate schema. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleExportDiagram = async () => {
    setIsExporting(true);
    try {
      const schema = { tables, name: 'schema' };
      const blob = await exportDiagram(schema, tablePositions, 'svg');
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'schema-diagram.svg';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export diagram. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleMouseDown = (tableName: string, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    
    const pos = tablePositions[tableName];
    if (pos) {
      setDraggingTable(tableName);
      setSelectedTable(tableName);
      setDragOffset({
        x: e.clientX - pos.x,
        y: e.clientY - pos.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingTable) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      setTablePositions({
        ...tablePositions,
        [draggingTable]: {
          x: Math.max(20, newX),
          y: Math.max(20, newY),
        },
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingTable(null);
  };

  const getAllRelationships = () => {
    const relationships: Array<{
      from: string;
      to: string;
      fromColumn: string;
      toColumn: string;
    }> = [];
    
    tables.forEach(table => {
      table.columns.forEach(column => {
        if (column.references) {
          relationships.push({
            from: table.name,
            to: column.references.table,
            fromColumn: column.name,
            toColumn: column.references.column,
          });
        }
      });
    });
    
    return relationships;
  };

  const getTableColor = (index: number) => {
    return TABLE_COLORS[index % TABLE_COLORS.length];
  };

  const drawRelationshipLines = () => {
    if (!showRelationships) return null;
    
    const relationships = getAllRelationships();
    const lines: JSX.Element[] = [];
    
    relationships.forEach((rel, idx) => {
      const fromPos = tablePositions[rel.from];
      const toPos = tablePositions[rel.to];
      
      if (fromPos && toPos) {
        // Get table colors
        const fromTableIndex = tables.findIndex(t => t.name === rel.from);
        const fromColor = getTableColor(fromTableIndex);
        
        // Extract gradient color
        const gradientMatch = fromColor.header.match(/from-(\w+)-(\d+)/);
        let strokeColor = '#3b82f6'; // default blue
        
        if (gradientMatch) {
          const colorName = gradientMatch[1];
          const colorMap: Record<string, string> = {
            'purple': '#a855f7',
            'blue': '#3b82f6',
            'green': '#10b981',
            'orange': '#f97316',
            'pink': '#ec4899',
            'indigo': '#6366f1',
            'teal': '#14b8a6',
            'red': '#ef4444',
            'cyan': '#06b6d4',
            'amber': '#f59e0b',
          };
          strokeColor = colorMap[colorName] || strokeColor;
        }
        
        const fromX = fromPos.x + 175;
        const fromY = fromPos.y + 150;
        const toX = toPos.x + 175;
        const toY = toPos.y + 150;
        
        lines.push(
          <g key={`rel-${idx}`}>
            <defs>
              <marker
                id={`arrowhead-${idx}`}
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill={strokeColor} />
              </marker>
            </defs>
            <path
              d={`M ${fromX} ${fromY} C ${fromX + 50} ${fromY}, ${toX - 50} ${toY}, ${toX} ${toY}`}
              stroke={strokeColor}
              strokeWidth="2.5"
              fill="none"
              markerEnd={`url(#arrowhead-${idx})`}
              className="transition-all duration-200 drop-shadow-md"
              opacity="0.8"
            />
            <circle cx={fromX} cy={fromY} r="5" fill={strokeColor} stroke="white" strokeWidth="2" />
          </g>
        );
      }
    });
    
    return lines;
  };

  const handleZoomIn = () => {
    setZoom(Math.min(zoom + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom - 0.1, 0.2));
  };

  const handleResetZoom = () => {
    setZoom(1.0);
  };

  const handleAutoLayout = () => {
    const newPositions: Record<string, TablePosition> = {};
    const centerX = 600;
    const centerY = 400;
    const minRadius = 150;
    const maxRadius = 500;
    
    tables.forEach((table) => {
      // Create spider web effect with random radius and angle
      const angle = (Math.random() * 2 * Math.PI); // Random angle in radians
      const radius = minRadius + Math.random() * (maxRadius - minRadius); // Random radius
      
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      newPositions[table.name] = { 
        x: Math.max(50, Math.min(1500, x)), 
        y: Math.max(50, Math.min(1000, y)) 
      };
    });
    
    setTablePositions(newPositions);
  };

  const handleFitToScreen = () => {
    if (tables.length === 0) return;
    
    // Calculate bounding box
    const positions = Object.values(tablePositions);
    if (positions.length === 0) return;
    
    const minX = Math.min(...positions.map(p => p.x));
    const maxX = Math.max(...positions.map(p => p.x)) + 350; // table width
    const minY = Math.min(...positions.map(p => p.y));
    const maxY = Math.max(...positions.map(p => p.y)) + 400; // approx table height
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    if (canvasRef.current) {
      const containerWidth = canvasRef.current.clientWidth;
      const containerHeight = canvasRef.current.clientHeight;
      
      const scaleX = (containerWidth * 0.9) / width;
      const scaleY = (containerHeight * 0.9) / height;
      const newZoom = Math.min(scaleX, scaleY, 1);
      
      setZoom(Math.max(0.2, Math.min(2, newZoom)));
    }
  };

  const filteredTables = tables.filter(table =>
    table.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    table.columns.some(col => col.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="w-full h-full flex bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Collapsible Sidebar Control Panel */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-80'} bg-white dark:bg-gradient-to-b dark:from-gray-900 dark:to-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden transition-all duration-300 shadow-xl`}>
        {/* Header with Toggle */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Designer
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {tables.length} • {getAllRelationships().length} rel
                  </p>
                </div>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${sidebarCollapsed ? 'mx-auto' : ''}`}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          </div>

          {/* Search */}
          {!sidebarCollapsed && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          )}
        </div>

        {/* Controls Section */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
          {/* Zoom Controls */}
          <div className="space-y-2">
            {!sidebarCollapsed && (
              <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">Zoom</h4>
            )}
            <div className={`flex ${sidebarCollapsed ? 'flex-col' : 'flex-row'} items-center gap-2 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-600/20 dark:to-purple-600/20 p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-500/30`}>
              <button
                onClick={handleZoomOut}
                className="p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-lg transition-all hover:scale-110"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
              </button>
              {!sidebarCollapsed && (
                <button
                  onClick={handleResetZoom}
                  className="flex-1 px-3 py-2 text-sm font-bold bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all text-white shadow-md"
                >
                  {Math.round(zoom * 100)}%
                </button>
              )}
              <button
                onClick={handleZoomIn}
                className="p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-lg transition-all hover:scale-110"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
              </button>
            </div>
          </div>

          {/* Layout Tools */}
          <div className="space-y-2">
            {!sidebarCollapsed && (
              <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">Layout</h4>
            )}
            <button
              onClick={handleAutoLayout}
              className="w-full px-3 py-2.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all flex items-center gap-3 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600/50 hover:border-gray-300 dark:hover:border-gray-500"
              title="Auto Layout"
            >
              <Grid className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              {!sidebarCollapsed && <span>Auto Layout</span>}
            </button>

            <button
              onClick={handleFitToScreen}
              className="w-full px-3 py-2.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all flex items-center gap-3 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600/50 hover:border-gray-300 dark:hover:border-gray-500"
              title="Fit to Screen"
            >
              <Maximize className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              {!sidebarCollapsed && <span>Fit Screen</span>}
            </button>

            <button
              onClick={() => setShowRelationships(!showRelationships)}
              className={`w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center gap-3 border ${
                showRelationships
                  ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-400/50'
                  : 'bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-300 border-gray-200 dark:border-gray-600/50 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
              title="Toggle Relationships"
            >
              <Link className="w-4 h-4" />
              {!sidebarCollapsed && <span>Relations</span>}
            </button>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {!sidebarCollapsed && (
              <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">Actions</h4>
            )}
            <button
              onClick={handleAddTable}
              className="w-full px-3 py-2.5 text-sm font-bold rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all flex items-center gap-3 text-white shadow-lg hover:shadow-xl"
              title="Add Table"
            >
              <Plus className="w-4 h-4" />
              {!sidebarCollapsed && <span>Add Table</span>}
            </button>

            <button
              onClick={() => setShowRelationshipPanel(!showRelationshipPanel)}
              className={`w-full px-3 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-3 shadow-lg hover:shadow-xl ${
                showRelationshipPanel
                  ? 'bg-gradient-to-r from-pink-500 to-rose-600'
                  : 'bg-gradient-to-r from-pink-400 to-rose-500 hover:from-pink-500 hover:to-rose-600'
              } text-white`}
              title="Manage Relationships"
            >
              <Link className="w-4 h-4" />
              {!sidebarCollapsed && <span>Relationships</span>}
            </button>

            <button
              onClick={() => setShowConstraintsPanel(!showConstraintsPanel)}
              className={`w-full px-3 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-3 shadow-lg hover:shadow-xl ${
                showConstraintsPanel
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600'
                  : 'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600'
              } text-white`}
              title="Database Constraints"
            >
              <Database className="w-4 h-4" />
              {!sidebarCollapsed && <span>Constraints</span>}
            </button>

            <button
              onClick={() => setShowTemplates(true)}
              className="w-full px-3 py-2.5 text-sm font-bold rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 transition-all flex items-center gap-3 text-white shadow-lg hover:shadow-xl"
              title="Templates"
            >
              <Layout className="w-4 h-4" />
              {!sidebarCollapsed && <span>Templates</span>}
            </button>

            <button
              onClick={handleValidateSchema}
              disabled={isValidating || tables.length === 0}
              className="w-full px-3 py-2.5 text-sm font-bold rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition-all flex items-center gap-3 text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              title="Validate"
            >
              <CheckCircle className="w-4 h-4" />
              {!sidebarCollapsed && <span>{isValidating ? 'Validating...' : 'Validate'}</span>}
            </button>

            <button
              onClick={handleExportDiagram}
              disabled={isExporting || tables.length === 0}
              className="w-full px-3 py-2.5 text-sm font-bold rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 transition-all flex items-center gap-3 text-white shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export"
            >
              <Download className="w-4 h-4" />
              {!sidebarCollapsed && <span>{isExporting ? 'Exporting...' : 'Export'}</span>}
            </button>

            <button
              onClick={() => setShowKeyboardHelp(true)}
              className="w-full px-3 py-2.5 text-sm font-medium rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-all flex items-center gap-3 text-gray-300 border border-gray-600/50 hover:border-gray-500"
              title="Keyboard Shortcuts"
            >
              <Keyboard className="w-4 h-4 text-amber-400" />
              {!sidebarCollapsed && <span>Shortcuts</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div 
        ref={canvasRef}
        className="flex-1 overflow-auto bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#374151_1px,transparent_1px)] [background-size:20px_20px] relative"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Zoomable Container */}
        <div 
          className="relative origin-top-left transition-transform duration-200"
          style={{
            transform: `scale(${zoom})`,
            minWidth: `${canvasSize.width * zoom}px`,
            minHeight: `${canvasSize.height * zoom}px`,
          }}
        >
          {/* SVG Layer for Relationship Lines */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ 
              width: `${canvasSize.width}px`,
              height: `${canvasSize.height}px`,
              zIndex: 0,
            }}
          >
            {drawRelationshipLines()}
          </svg>

          {/* Tables Container */}
          <div className="relative" style={{ width: `${canvasSize.width}px`, height: `${canvasSize.height}px` }}>
            {filteredTables.length === 0 && tables.length > 0 ? (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No tables found
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Try adjusting your search query
                </p>
              </div>
            ) : filteredTables.length === 0 ? (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Database className="w-12 h-12 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Tables Yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
                Start designing your database schema by adding tables
              </p>
              <Button onClick={handleAddTable}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Table
              </Button>
            </div>
          ) : (
            filteredTables.map((table) => {
              const actualIndex = tables.findIndex(t => t.name === table.name);
              const pos = tablePositions[table.name] || { x: 0, y: 0 };
              const color = getTableColor(actualIndex);
              const isSelected = selectedTable === table.name;
              const isDragging = draggingTable === table.name;

              return (
                <div
                  key={table.name}
                  className={`absolute bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 transition-shadow duration-200 cursor-move ${
                    isSelected
                      ? 'border-blue-500 shadow-xl shadow-blue-500/30 ring-2 ring-blue-400/30 z-20'
                      : 'border-gray-200 dark:border-gray-700 hover:shadow-xl z-10'
                  } ${isDragging ? 'opacity-80 cursor-grabbing' : 'cursor-grab'}`}
                  style={{
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                    width: '350px',
                    maxWidth: '90vw',
                  }}
                  onMouseDown={(e) => handleMouseDown(table.name, e)}
                  onClick={() => setSelectedTable(table.name)}
                >
                  {/* Table Header */}
                  <div className={`${color.header} px-4 py-3 rounded-t-lg flex items-center justify-between ${color.text}`}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Move className="w-4 h-4 flex-shrink-0 opacity-70" />
                      <h4 className="font-bold text-base truncate">{table.name}</h4>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTable(table);
                        }}
                        className="p-1.5 hover:bg-white/20 rounded transition-colors"
                        title="Edit table"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTable(table.name);
                        }}
                        className="p-1.5 hover:bg-white/20 rounded transition-colors"
                        title="Delete table"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Columns */}
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    {table.columns.map((column, idx) => (
                      <div
                        key={idx}
                        className={`group/column px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                          idx === table.columns.length - 1 ? 'border-b-0 rounded-b-lg' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <div className="flex items-center gap-1.5 min-w-[24px]">
                            {column.primaryKey && (
                              <span className="text-amber-500 dark:text-amber-400" title="Primary Key">
                                🔑
                              </span>
                            )}
                            {column.references ? (
                              <span className="text-blue-500 dark:text-blue-400" title={`FK → ${column.references.table}`}>
                                🔗
                              </span>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartRelationship(table.name, column.name);
                                }}
                                className="opacity-0 group-hover/column:opacity-100 p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-all"
                                title="Create relationship"
                              >
                                <Link className="w-3 h-3 text-gray-400 hover:text-blue-600" />
                              </button>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-gray-900 dark:text-white font-mono truncate">
                                {column.name}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 dark:text-gray-400 text-xs font-mono flex-shrink-0">
                                  {column.type}
                                </span>
                                {creatingRelationship && creatingRelationship.fromTable === table.name && creatingRelationship.fromColumn === column.name && (
                                  <span className="px-2 py-0.5 rounded bg-blue-500 text-white text-[9px] font-bold animate-pulse">
                                    SELECT TARGET
                                  </span>
                                )}
                                {creatingRelationship && creatingRelationship.fromTable !== table.name && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCompleteRelationship(table.name, column.name);
                                    }}
                                    className="px-2 py-0.5 rounded bg-green-500 hover:bg-green-600 text-white text-[9px] font-bold transition-colors"
                                  >
                                    LINK HERE
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {!column.nullable && (
                                <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[9px] font-bold">
                                  NOT NULL
                                </span>
                              )}
                              {column.unique && (
                                <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-[9px] font-bold">
                                  UNIQUE
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
                    <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                      <span>{table.columns.length} column{table.columns.length !== 1 ? 's' : ''}</span>
                      {table.indexes && table.indexes.length > 0 && (
                        <>
                          <span>•</span>
                          <span>{table.indexes.length} index{table.indexes.length !== 1 ? 'es' : ''}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>
      </div>

      {/* Table Editor Modal */}
      {editingTable && (
        <TableEditor
          table={editingTable}
          allTables={tables}
          onSave={handleSaveTable}
          onCancel={() => setEditingTable(null)}
        />
      )}

      {/* Relationship Creation Banner */}
      {creatingRelationship && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-4 z-50 animate-slide-in">
          <div className="flex items-center gap-2">
            <Link className="w-5 h-5 animate-pulse" />
            <span className="font-semibold">
              Creating relationship from {creatingRelationship.fromTable}.{creatingRelationship.fromColumn}
            </span>
          </div>
          <button
            onClick={handleCancelRelationship}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded transition-colors text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Table Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Table Templates</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Quick-add common database patterns
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TABLE_TEMPLATES.map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAddFromTemplate(template)}
                    className="text-left p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all hover:shadow-md group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {template.name}
                      </h4>
                      <Plus className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {template.tables.length} table{template.tables.length !== 1 ? 's' : ''} • {' '}
                      {template.tables.reduce((acc, t) => acc + t.columns.length, 0)} columns
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {template.tables.map((table, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300"
                        >
                          {table.name}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setShowTemplates(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-900 dark:text-white font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help Modal */}
      {showKeyboardHelp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-500 to-purple-600">
              <div className="flex items-center gap-3">
                <Keyboard className="w-6 h-6 text-white" />
                <div>
                  <h3 className="text-lg font-bold text-white">Keyboard Shortcuts</h3>
                  <p className="text-sm text-indigo-100 mt-0.5">
                    Speed up your workflow with these shortcuts
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Zoom Controls */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <ZoomIn className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Zoom Controls
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-700/50">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Zoom In</span>
                      <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">Ctrl/Cmd + +</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-700/50">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Zoom Out</span>
                      <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">Ctrl/Cmd + -</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-700/50">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Reset Zoom</span>
                      <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">Ctrl/Cmd + 0</kbd>
                    </div>
                  </div>
                </div>

                {/* Table Actions */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Table Actions
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-700/50">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Add New Table</span>
                      <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">Ctrl/Cmd + A</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-700/50">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Delete Selected Table</span>
                      <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">Delete</kbd>
                    </div>
                  </div>
                </div>

                {/* Layout Actions */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Layout className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Layout Actions
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-700/50">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Auto Layout (Grid)</span>
                      <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">Ctrl/Cmd + L</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-700/50">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Fit to Screen</span>
                      <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">Ctrl/Cmd + F</kbd>
                    </div>
                  </div>
                </div>

                {/* Mouse Actions */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Move className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Mouse Actions
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-700/50">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Drag Table</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Click & Drag Table Header</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-700/50">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Create Relationship</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Click Column → Target Column</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end bg-gray-50 dark:bg-gray-900/50">
              <button
                onClick={() => setShowKeyboardHelp(false)}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-lg text-white font-medium transition-colors shadow-sm"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Results Modal */}
      {showValidation && validationResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col animate-fadeIn">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Schema Validation Results</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {validationResult.valid ? (
                      <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Schema is valid
                      </span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        Schema has issues
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setShowValidation(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {validationResult.summary.errors}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Errors</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {validationResult.summary.warnings}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Warnings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {validationResult.summary.info}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Info</div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {validationResult.issues.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium">No issues found!</p>
                  <p className="text-sm mt-2">Your schema looks good.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {validationResult.issues.map((issue, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border-l-4 ${
                        issue.type === 'error'
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
                          : issue.type === 'warning'
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
                          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 ${
                          issue.type === 'error'
                            ? 'text-red-600 dark:text-red-400'
                            : issue.type === 'warning'
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`}>
                          {issue.type === 'error' ? (
                            <AlertCircle className="w-5 h-5" />
                          ) : (
                            <AlertCircle className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-semibold uppercase ${
                              issue.type === 'error'
                                ? 'text-red-700 dark:text-red-300'
                                : issue.type === 'warning'
                                ? 'text-yellow-700 dark:text-yellow-300'
                                : 'text-blue-700 dark:text-blue-300'
                            }`}>
                              {issue.type}
                            </span>
                            {issue.table && (
                              <span className="text-xs font-mono bg-white dark:bg-gray-800 px-2 py-0.5 rounded text-gray-700 dark:text-gray-300">
                                {issue.table}
                                {issue.column && `.${issue.column}`}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {issue.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => setShowValidation(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-900 dark:text-white font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Relationship Management Panel */}
      {showRelationshipPanel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-pink-500 to-rose-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Link className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Foreign Key Relationships</h3>
                    <p className="text-sm text-pink-100 mt-0.5">Manage table relationships and constraints</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRelationshipPanel(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {getAllRelationships().length === 0 ? (
                <div className="text-center py-16">
                  <Link className="w-20 h-20 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No Relationships Yet
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Create foreign key relationships by clicking the link icon next to any column
                  </p>
                  <div className="max-w-md mx-auto bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 text-left">
                      <strong>How to create relationships:</strong>
                      <ol className="mt-2 space-y-1 ml-4 list-decimal">
                        <li>Click the 🔗 icon next to a column in any table</li>
                        <li>Click "LINK HERE" button on the target column</li>
                        <li>The foreign key relationship will be created automatically</li>
                      </ol>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/10 dark:to-rose-900/10 border border-pink-200 dark:border-pink-800 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Total Relationships: {getAllRelationships().length}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      All foreign key constraints in your schema
                    </p>
                  </div>

                  {getAllRelationships().map((rel, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-pink-500 dark:hover:border-pink-500 transition-all bg-white dark:bg-gray-900/50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="text-center">
                            <div className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg mb-1">
                              <span className="text-sm font-bold text-blue-900 dark:text-blue-300">
                                {rel.from}
                              </span>
                            </div>
                            <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                              {rel.fromColumn}
                            </span>
                          </div>
                          
                          <div className="flex flex-col items-center">
                            <div className="flex items-center gap-2">
                              <div className="h-0.5 w-8 bg-gradient-to-r from-pink-500 to-rose-500"></div>
                              <Link className="w-4 h-4 text-pink-500" />
                              <div className="h-0.5 w-8 bg-gradient-to-r from-pink-500 to-rose-500"></div>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-semibold">
                              REFERENCES
                            </span>
                          </div>

                          <div className="text-center">
                            <div className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg mb-1">
                              <span className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                                {rel.to}
                              </span>
                            </div>
                            <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                              {rel.toColumn}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            const updatedTables = tables.map(table => {
                              if (table.name === rel.from) {
                                return {
                                  ...table,
                                  columns: table.columns.map(col => 
                                    col.name === rel.fromColumn
                                      ? { ...col, references: undefined }
                                      : col
                                  )
                                };
                              }
                              return table;
                            });
                            onTablesChange(updatedTables);
                          }}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors group"
                          title="Delete Relationship"
                        >
                          <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <button
                onClick={() => setShowRelationshipPanel(false)}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 rounded-lg text-white font-semibold transition-colors shadow-md"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Database Constraints Panel */}
      {showConstraintsPanel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-amber-500 to-orange-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Database className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Database Constraints & Features</h3>
                    <p className="text-sm text-amber-100 mt-0.5">Advanced SQL features and constraints</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowConstraintsPanel(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Constraints Overview */}
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                    <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      Active Constraints
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-900/50 rounded">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Primary Keys</span>
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-300 rounded font-bold text-sm">
                          {tables.reduce((acc, t) => acc + (t.primaryKey ? 1 : 0), 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-900/50 rounded">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Foreign Keys</span>
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-300 rounded font-bold text-sm">
                          {getAllRelationships().length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-900/50 rounded">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Unique Constraints</span>
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-300 rounded font-bold text-sm">
                          {tables.reduce((acc, t) => acc + t.columns.filter(c => c.unique).length, 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-900/50 rounded">
                        <span className="text-sm text-gray-700 dark:text-gray-300">NOT NULL Constraints</span>
                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-300 rounded font-bold text-sm">
                          {tables.reduce((acc, t) => acc + t.columns.filter(c => !c.nullable).length, 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-900/50 rounded">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Indexes</span>
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-300 rounded font-bold text-sm">
                          {tables.reduce((acc, t) => acc + (t.indexes?.length || 0), 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                    <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      Available Features
                    </h4>
                    <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <div className="flex items-start gap-2">
                        <span className="text-purple-600 dark:text-purple-400 mt-0.5">●</span>
                        <div>
                          <strong>Check Constraints:</strong> Define custom validation rules
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-purple-600 dark:text-purple-400 mt-0.5">●</span>
                        <div>
                          <strong>Triggers:</strong> Automated actions on data changes
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-purple-600 dark:text-purple-400 mt-0.5">●</span>
                        <div>
                          <strong>Views:</strong> Virtual tables based on queries
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-purple-600 dark:text-purple-400 mt-0.5">●</span>
                        <div>
                          <strong>Stored Procedures:</strong> Reusable SQL code blocks
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Best Practices */}
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      Best Practices
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="bg-white dark:bg-gray-900/50 rounded-lg p-3">
                        <div className="font-semibold text-gray-900 dark:text-white mb-1">
                          ✓ Always use Primary Keys
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-xs">
                          Every table should have a primary key for unique row identification
                        </p>
                      </div>
                      <div className="bg-white dark:bg-gray-900/50 rounded-lg p-3">
                        <div className="font-semibold text-gray-900 dark:text-white mb-1">
                          ✓ Index Foreign Keys
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-xs">
                          Add indexes on foreign key columns to improve JOIN performance
                        </p>
                      </div>
                      <div className="bg-white dark:bg-gray-900/50 rounded-lg p-3">
                        <div className="font-semibold text-gray-900 dark:text-white mb-1">
                          ✓ Use Appropriate Data Types
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-xs">
                          Choose the most efficient data type for your use case
                        </p>
                      </div>
                      <div className="bg-white dark:bg-gray-900/50 rounded-lg p-3">
                        <div className="font-semibold text-gray-900 dark:text-white mb-1">
                          ✓ Enforce Referential Integrity
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-xs">
                          Use foreign keys to maintain data consistency across tables
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                    <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      Common Pitfalls
                    </h4>
                    <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <div className="flex items-start gap-2">
                        <span className="text-orange-600 dark:text-orange-400 mt-0.5">⚠</span>
                        <div>Missing indexes on frequently queried columns</div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-orange-600 dark:text-orange-400 mt-0.5">⚠</span>
                        <div>Circular foreign key dependencies</div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-orange-600 dark:text-orange-400 mt-0.5">⚠</span>
                        <div>Overly permissive NULL constraints</div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-orange-600 dark:text-orange-400 mt-0.5">⚠</span>
                        <div>Table and column names exceeding length limits</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <button
                onClick={() => setShowConstraintsPanel(false)}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 rounded-lg text-white font-semibold transition-colors shadow-md"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Table</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Are you sure you want to delete this table?
                  </p>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-6">
                <p className="text-sm font-mono text-gray-900 dark:text-white font-semibold">
                  {deleteConfirmation.tableName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  This action cannot be undone. All relationships to this table will also be removed.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelDeleteTable}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteTable}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-lg transition-all shadow-lg hover:shadow-xl"
                >
                  Delete Table
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    </div>
  );
};
