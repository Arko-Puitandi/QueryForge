import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
  useReactFlow,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Table } from '../../types';
import { Plus, Edit2, Trash2, Database, Link, Maximize, Layout } from 'lucide-react';
import { TableEditor } from './TableEditor';
import { ConfirmModal } from '../common';

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

// Custom node component
const SchemaTableNode = ({ data }: any) => {
  const { table, onEdit, onDelete, color } = data;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border-2 border-gray-300 dark:border-gray-600 min-w-[280px] max-w-[320px]">
      {/* Connection Handles - all support both source and target */}
      <Handle type="source" position={Position.Top} id="top-source" className="!bg-blue-500 !w-3 !h-3 !-top-1.5" />
      <Handle type="target" position={Position.Top} id="top-target" className="!bg-green-500 !w-3 !h-3 !-top-1.5 !left-[45%]" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="!bg-blue-500 !w-3 !h-3 !-bottom-1.5" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="!bg-green-500 !w-3 !h-3 !-bottom-1.5 !left-[45%]" />
      <Handle type="source" position={Position.Left} id="left-source" className="!bg-blue-500 !w-3 !h-3 !-left-1.5" />
      <Handle type="target" position={Position.Left} id="left-target" className="!bg-green-500 !w-3 !h-3 !-left-1.5 !top-[45%]" />
      <Handle type="source" position={Position.Right} id="right-source" className="!bg-blue-500 !w-3 !h-3 !-right-1.5" />
      <Handle type="target" position={Position.Right} id="right-target" className="!bg-green-500 !w-3 !h-3 !-right-1.5 !top-[45%]" />
      
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

      <div className="max-h-[300px] overflow-y-auto">
        {table.columns.map((column: any, idx: number) => (
          <div
            key={idx}
            className={`px-4 py-2 text-sm border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
              idx === table.columns.length - 1 ? 'rounded-b-lg border-b-0' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {column.primaryKey && <span className="text-yellow-500 text-xs">🔑</span>}
                {column.references && <Link className="w-3 h-3 text-blue-500" />}
                <span className="font-medium text-gray-900 dark:text-white truncate">{column.name}</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">{column.type}</span>
            </div>
            {column.references && (
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 ml-5">
                → {column.references.table}.{column.references.column}
              </div>
            )}
          </div>
        ))}
      </div>

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

const nodeTypes = {
  schemaTable: SchemaTableNode,
};

// Smart layout algorithm that positions tables to minimize edge crossings
const calculateSmartLayout = (tables: Table[]): Record<string, { x: number; y: number }> => {
  const positions: Record<string, { x: number; y: number }> = {};
  
  if (tables.length === 0) return positions;
  
  // Build dependency graph
  const dependencies: Record<string, string[]> = {}; // table -> tables it references
  const dependents: Record<string, string[]> = {};   // table -> tables that reference it
  
  tables.forEach(table => {
    dependencies[table.name] = [];
    dependents[table.name] = [];
  });
  
  tables.forEach(table => {
    table.columns.forEach(col => {
      if (col.references && tables.find(t => t.name === col.references!.table)) {
        dependencies[table.name].push(col.references.table);
        dependents[col.references.table].push(table.name);
      }
    });
  });
  
  // Assign levels using topological sort (Kahn's algorithm)
  const levels: string[][] = [];
  const tableLevel: Record<string, number> = {};
  const visited = new Set<string>();
  
  // Find root tables (no dependencies or only reference themselves)
  const roots = tables.filter(t => dependencies[t.name].length === 0).map(t => t.name);
  
  // If no roots, find tables with fewest dependencies
  if (roots.length === 0) {
    const sorted = [...tables].sort((a, b) => 
      dependencies[a.name].length - dependencies[b.name].length
    );
    roots.push(sorted[0].name);
  }
  
  // BFS to assign levels
  let currentLevel = roots;
  let levelNum = 0;
  
  while (currentLevel.length > 0 && visited.size < tables.length) {
    levels[levelNum] = [];
    const nextLevel: string[] = [];
    
    currentLevel.forEach(tableName => {
      if (!visited.has(tableName)) {
        visited.add(tableName);
        levels[levelNum].push(tableName);
        tableLevel[tableName] = levelNum;
        
        // Add dependents to next level
        dependents[tableName]?.forEach(dep => {
          if (!visited.has(dep)) {
            nextLevel.push(dep);
          }
        });
      }
    });
    
    // Remove duplicates from next level
    currentLevel = [...new Set(nextLevel)];
    levelNum++;
  }
  
  // Add any remaining tables (disconnected or circular refs)
  tables.forEach(t => {
    if (!visited.has(t.name)) {
      const lastLevel = levels.length - 1;
      if (!levels[lastLevel]) levels[lastLevel] = [];
      levels[lastLevel].push(t.name);
      tableLevel[t.name] = lastLevel;
    }
  });
  
  // Sort tables within each level to minimize edge crossings
  // Place child tables near their parents
  for (let i = 1; i < levels.length; i++) {
    levels[i].sort((a, b) => {
      // Calculate average x position of parents
      const aParents = dependencies[a] || [];
      const bParents = dependencies[b] || [];
      
      const aParentPositions = aParents
        .filter(p => tableLevel[p] < i)
        .map(p => levels[tableLevel[p]]?.indexOf(p) ?? 0);
      const bParentPositions = bParents
        .filter(p => tableLevel[p] < i)
        .map(p => levels[tableLevel[p]]?.indexOf(p) ?? 0);
      
      const aAvg = aParentPositions.length > 0 
        ? aParentPositions.reduce((s, v) => s + v, 0) / aParentPositions.length 
        : 999;
      const bAvg = bParentPositions.length > 0 
        ? bParentPositions.reduce((s, v) => s + v, 0) / bParentPositions.length 
        : 999;
      
      return aAvg - bAvg;
    });
  }
  
  // Calculate positions
  const TABLE_WIDTH = 300;
  const TABLE_HEIGHT = 350;
  const H_SPACING = 80;  // Horizontal gap between tables
  const V_SPACING = 100; // Vertical gap between levels
  
  const maxTablesInLevel = Math.max(...levels.map(l => l.length));
  const totalWidth = maxTablesInLevel * (TABLE_WIDTH + H_SPACING);
  
  levels.forEach((level, levelIdx) => {
    const levelWidth = level.length * (TABLE_WIDTH + H_SPACING) - H_SPACING;
    const startX = (totalWidth - levelWidth) / 2 + 100;
    
    level.forEach((tableName, tableIdx) => {
      positions[tableName] = {
        x: startX + tableIdx * (TABLE_WIDTH + H_SPACING),
        y: 100 + levelIdx * (TABLE_HEIGHT + V_SPACING),
      };
    });
  });
  
  return positions;
};

const VisualSchemaDesignerInner: React.FC<VisualSchemaDesignerProps> = ({
  tables,
  onTablesChange,
  initialPositions = {},
  onPositionsChange,
}) => {
  const { fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [showRelationships, setShowRelationships] = useState(true);
  const [deleteTableName, setDeleteTableName] = useState<string | null>(null);

  // Calculate smart positions on first load if no positions exist
  const [smartPositions, setSmartPositions] = useState<Record<string, { x: number; y: number }>>({});
  
  useEffect(() => {
    // Only calculate smart layout if no initial positions provided
    const hasPositions = Object.keys(initialPositions).length > 0;
    if (!hasPositions && tables.length > 0) {
      const calculated = calculateSmartLayout(tables);
      setSmartPositions(calculated);
      if (onPositionsChange) {
        onPositionsChange(calculated);
      }
    }
  }, [tables.length]); // Only recalculate when table count changes

  useEffect(() => {
    const positions = Object.keys(initialPositions).length > 0 ? initialPositions : smartPositions;
    
    const flowNodes: Node[] = tables.map((table, idx) => {
      let position = positions[table.name];
      
      if (!position) {
        // Fallback grid layout
        const cols = Math.ceil(Math.sqrt(tables.length * 1.5));
        const row = Math.floor(idx / cols);
        const col = idx % cols;
        position = {
          x: 100 + col * 400,
          y: 100 + row * 450,
        };
      }

      return {
        id: table.name,
        type: 'schemaTable',
        position,
        data: {
          table,
          onEdit: () => setEditingTable(table),
          onDelete: () => handleDeleteTable(table.name),
          color: TABLE_COLORS[idx % TABLE_COLORS.length],
        },
      };
    });

    setNodes(flowNodes);
  }, [tables, initialPositions, smartPositions]);

  useEffect(() => {
    if (!showRelationships) {
      setEdges([]);
      return;
    }

    // Wait for nodes to be ready
    if (nodes.length === 0 && tables.length > 0) {
      return;
    }

    const relationshipColors = [
      { stroke: '#22d3ee', labelBg: '#0891b2', labelText: '#ffffff' },  // cyan
      { stroke: '#4ade80', labelBg: '#16a34a', labelText: '#ffffff' },  // green
      { stroke: '#facc15', labelBg: '#ca8a04', labelText: '#ffffff' },  // yellow
      { stroke: '#a78bfa', labelBg: '#7c3aed', labelText: '#ffffff' },  // purple
      { stroke: '#fb7185', labelBg: '#e11d48', labelText: '#ffffff' },  // pink
      { stroke: '#60a5fa', labelBg: '#2563eb', labelText: '#ffffff' },  // blue
      { stroke: '#fb923c', labelBg: '#ea580c', labelText: '#ffffff' },  // orange
      { stroke: '#2dd4bf', labelBg: '#0d9488', labelText: '#ffffff' },  // teal
    ];

    const flowEdges: Edge[] = [];
    let colorIndex = 0;
    
    tables.forEach((table) => {
      table.columns.forEach((column) => {
        if (column.references) {
          const targetTable = tables.find(t => t.name === column.references!.table);
          if (targetTable) {
            const color = relationshipColors[colorIndex % relationshipColors.length];
            
            // Get node positions to determine edge direction
            const sourceNode = nodes.find(n => n.id === table.name);
            const targetNode = nodes.find(n => n.id === column.references!.table);
            
            // Default handles
            let sourceHandle = 'top-source';
            let targetHandle = 'bottom-target';
            
            if (sourceNode && targetNode) {
              const dy = targetNode.position.y - sourceNode.position.y;
              const dx = targetNode.position.x - sourceNode.position.x;
              
              if (Math.abs(dy) > Math.abs(dx)) {
                // More vertical
                if (dy < 0) {
                  // Target is ABOVE source
                  sourceHandle = 'top-source';
                  targetHandle = 'bottom-target';
                } else {
                  // Target is BELOW source
                  sourceHandle = 'bottom-source';
                  targetHandle = 'top-target';
                }
              } else {
                // More horizontal
                if (dx > 0) {
                  // Target is to the RIGHT
                  sourceHandle = 'right-source';
                  targetHandle = 'left-target';
                } else {
                  // Target is to the LEFT
                  sourceHandle = 'left-source';
                  targetHandle = 'right-target';
                }
              }
            }
            
            colorIndex++;
            
            const edge: Edge = {
              id: `${table.name}-${column.name}-${column.references.table}`,
              source: table.name,
              target: column.references.table,
              sourceHandle,
              targetHandle,
              type: 'smoothstep',
              animated: true,
              label: column.name,
              labelStyle: { 
                fill: color.labelText, 
                fontWeight: 700, 
                fontSize: 10,
                letterSpacing: '0.025em',
              },
              labelBgStyle: { 
                fill: color.labelBg,
                fillOpacity: 1,
                rx: 4,
                ry: 4,
              },
              labelBgPadding: [6, 4] as [number, number],
              labelBgBorderRadius: 4,
              style: { 
                strokeWidth: 2.5,
                stroke: color.stroke,
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: color.stroke,
                width: 12,
                height: 12,
              },
            };
            
            flowEdges.push(edge);
          }
        }
      });
    });

    setEdges(flowEdges);
  }, [tables, showRelationships, nodes, setEdges]);

  const handleNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    if (onPositionsChange) {
      const newPositions = { ...initialPositions, [node.id]: node.position };
      onPositionsChange(newPositions);
    }
  }, [initialPositions, onPositionsChange]);

  const handleDeleteTable = (tableName: string) => {
    setDeleteTableName(tableName);
  };

  const executeDeleteTable = () => {
    if (deleteTableName) {
      onTablesChange(tables.filter(t => t.name !== deleteTableName));
      setDeleteTableName(null);
    }
  };

  const handleAddTable = () => {
    const newTable: Table = {
      name: `table_${tables.length + 1}`,
      columns: [{ name: 'id', type: 'BIGINT', primaryKey: true, nullable: false, unique: false }],
      primaryKey: ['id'],
      indexes: [],
    };
    onTablesChange([...tables, newTable]);
  };

  const handleSaveTable = (updatedTable: Table) => {
    const newTables = tables.map(t => (t.name === editingTable?.name ? updatedTable : t));
    onTablesChange(newTables);
    setEditingTable(null);
  };

  const [layoutType, setLayoutType] = useState<'grid' | 'circular' | 'hierarchical' | 'horizontal' | 'vertical' | 'radial' | 'snake' | 'diagonal'>('grid');
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);

  const handleAutoLayout = (type?: 'grid' | 'circular' | 'hierarchical' | 'horizontal' | 'vertical' | 'radial' | 'snake' | 'diagonal') => {
    const activeLayout = type || layoutType;
    const newPositions: Record<string, TablePosition> = {};
    const tableCount = tables.length;

    if (activeLayout === 'grid') {
      // Grid layout with good spacing
      const cols = Math.ceil(Math.sqrt(tableCount * 1.5));
      const horizontalSpacing = 450;
      const verticalSpacing = 400;
      const startX = 100;
      const startY = 100;

      tables.forEach((table, idx) => {
        const row = Math.floor(idx / cols);
        const col = idx % cols;
        const rowOffset = (row % 2) * 100;
        
        newPositions[table.name] = {
          x: startX + col * horizontalSpacing + rowOffset,
          y: startY + row * verticalSpacing,
        };
      });
    } else if (activeLayout === 'circular') {
      // Circular layout - radius increases with table count
      const baseRadius = Math.max(400, tableCount * 60);
      const centerX = baseRadius + 200;
      const centerY = baseRadius + 200;

      tables.forEach((table, index) => {
        const angle = (index / tableCount) * 2 * Math.PI - Math.PI / 2;
        newPositions[table.name] = {
          x: centerX + baseRadius * Math.cos(angle),
          y: centerY + baseRadius * Math.sin(angle),
        };
      });
    } else if (activeLayout === 'hierarchical') {
      // Use the smart layout algorithm
      const smartLayout = calculateSmartLayout(tables);
      Object.assign(newPositions, smartLayout);
    } else if (activeLayout === 'horizontal') {
      // Horizontal line layout
      const horizontalSpacing = 400;
      const startX = 100;
      const startY = 300;

      tables.forEach((table, idx) => {
        newPositions[table.name] = {
          x: startX + idx * horizontalSpacing,
          y: startY + (idx % 2) * 80, // Slight stagger
        };
      });
    } else if (activeLayout === 'vertical') {
      // Vertical line layout
      const verticalSpacing = 380;
      const startX = 400;
      const startY = 100;

      tables.forEach((table, idx) => {
        newPositions[table.name] = {
          x: startX + (idx % 2) * 80, // Slight stagger
          y: startY + idx * verticalSpacing,
        };
      });
    } else if (activeLayout === 'radial') {
      // Radial/Star layout - first table in center, others around it
      const centerX = 600;
      const centerY = 500;
      const radius = Math.max(350, tableCount * 50);

      tables.forEach((table, index) => {
        if (index === 0) {
          // First table in center
          newPositions[table.name] = { x: centerX, y: centerY };
        } else {
          // Others in a circle around center
          const angle = ((index - 1) / (tableCount - 1)) * 2 * Math.PI - Math.PI / 2;
          newPositions[table.name] = {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
          };
        }
      });
    } else if (activeLayout === 'snake') {
      // Snake/Zigzag layout
      const cols = 3;
      const horizontalSpacing = 420;
      const verticalSpacing = 400;
      const startX = 100;
      const startY = 100;

      tables.forEach((table, idx) => {
        const row = Math.floor(idx / cols);
        const colInRow = idx % cols;
        // Reverse direction on odd rows (snake pattern)
        const col = row % 2 === 0 ? colInRow : (cols - 1 - colInRow);
        
        newPositions[table.name] = {
          x: startX + col * horizontalSpacing,
          y: startY + row * verticalSpacing,
        };
      });
    } else if (activeLayout === 'diagonal') {
      // Diagonal/Cascade layout
      const horizontalSpacing = 380;
      const verticalSpacing = 350;
      const startX = 100;
      const startY = 100;

      tables.forEach((table, idx) => {
        newPositions[table.name] = {
          x: startX + idx * horizontalSpacing,
          y: startY + idx * verticalSpacing,
        };
      });
    }

    if (onPositionsChange) {
      onPositionsChange(newPositions);
    }
    
    // Trigger re-render with new positions
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  };

  return (
    <>
      <div className="h-full w-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={handleNodeDragStop}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
          maxZoom={2}
          elevateEdgesOnSelect={true}
          edgesFocusable={true}
          defaultEdgeOptions={{
            type: 'smoothstep',
            style: { strokeWidth: 3 },
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#e2e8f0" gap={16} />
          <Controls showInteractive={false} className="bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700" />
          <MiniMap
            nodeColor={(node) => {
              const colorIdx = tables.findIndex(t => t.name === node.id) % TABLE_COLORS.length;
              const colors = ['#9333ea', '#3b82f6', '#22c55e', '#f97316', '#ec4899', '#6366f1', '#14b8a6', '#ef4444', '#06b6d4', '#f59e0b'];
              return colors[colorIdx] || '#3b82f6';
            }}
            className="bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700"
            maskColor="rgb(240, 240, 240, 0.6)"
          />

          {/* Compact Control Panel */}
          <Panel position="top-left">
            <div className="flex items-center gap-1 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1">
              <button
                onClick={handleAddTable}
                className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded transition-colors"
                title="Add Table"
              >
                <Plus className="w-4 h-4" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowLayoutMenu(!showLayoutMenu)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded transition-colors flex items-center gap-1"
                  title="Auto Layout"
                >
                  <Layout className="w-4 h-4" />
                </button>
                {showLayoutMenu && (
                  <div className="absolute left-0 top-full mt-1 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[160px]">
                      <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        Basic Layouts
                      </div>
                      <button
                        onClick={() => { setLayoutType('grid'); handleAutoLayout('grid'); setShowLayoutMenu(false); }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                          layoutType === 'grid' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span>▦</span> Grid
                      </button>
                      <button
                        onClick={() => { setLayoutType('horizontal'); handleAutoLayout('horizontal'); setShowLayoutMenu(false); }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                          layoutType === 'horizontal' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span>↔</span> Horizontal
                      </button>
                      <button
                        onClick={() => { setLayoutType('vertical'); handleAutoLayout('vertical'); setShowLayoutMenu(false); }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                          layoutType === 'vertical' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span>↕</span> Vertical
                      </button>
                      
                      <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                      <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        Circular Layouts
                      </div>
                      <button
                        onClick={() => { setLayoutType('circular'); handleAutoLayout('circular'); setShowLayoutMenu(false); }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                          layoutType === 'circular' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span>◯</span> Circle
                      </button>
                      <button
                        onClick={() => { setLayoutType('radial'); handleAutoLayout('radial'); setShowLayoutMenu(false); }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                          layoutType === 'radial' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span>✳</span> Radial (Star)
                      </button>
                      
                      <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                      <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        Special Layouts
                      </div>
                      <button
                        onClick={() => { setLayoutType('hierarchical'); handleAutoLayout('hierarchical'); setShowLayoutMenu(false); }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                          layoutType === 'hierarchical' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span>🌳</span> Hierarchical
                      </button>
                      <button
                        onClick={() => { setLayoutType('snake'); handleAutoLayout('snake'); setShowLayoutMenu(false); }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                          layoutType === 'snake' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span>〰</span> Snake
                      </button>
                      <button
                        onClick={() => { setLayoutType('diagonal'); handleAutoLayout('diagonal'); setShowLayoutMenu(false); }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                          layoutType === 'diagonal' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span>⤡</span> Diagonal
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => fitView({ padding: 0.2 })}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded transition-colors"
                title="Fit View"
              >
                <Maximize className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
              <button
                onClick={() => setShowRelationships(!showRelationships)}
                className={`p-2 rounded transition-colors ${
                  showRelationships
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500'
                }`}
                title={showRelationships ? 'Hide Relations' : 'Show Relations'}
              >
                <Link className="w-4 h-4" />
              </button>
            </div>
          </Panel>

          {/* Compact Info Panel */}
          <Panel position="top-right">
            <div className="flex items-center gap-3 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs">
                <Database className="w-3.5 h-3.5 text-blue-500" />
                <span className="font-semibold text-gray-900 dark:text-white">{tables.length}</span>
              </div>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
              <div className="flex items-center gap-1.5 text-xs">
                <Link className="w-3.5 h-3.5 text-purple-500" />
                <span className="font-semibold text-gray-900 dark:text-white">{edges.length}</span>
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {editingTable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <TableEditor table={editingTable} allTables={tables} onSave={handleSaveTable} onCancel={() => setEditingTable(null)} />
          </div>
        </div>
      )}

      {/* Delete Table Confirmation */}
      <ConfirmModal
        isOpen={deleteTableName !== null}
        onClose={() => setDeleteTableName(null)}
        onConfirm={executeDeleteTable}
        title="Delete Table"
        message={`Are you sure you want to delete table "${deleteTableName}"? This will also remove any relationships to this table.`}
        variant="danger"
        confirmText="Delete Table"
      />
    </>
  );
};

export const VisualSchemaDesigner: React.FC<VisualSchemaDesignerProps> = (props) => {
  return (
    <ReactFlowProvider>
      <VisualSchemaDesignerInner {...props} />
    </ReactFlowProvider>
  );
};
