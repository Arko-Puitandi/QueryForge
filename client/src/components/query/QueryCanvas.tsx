import React, { useCallback, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Connection,
  MarkerType,
  Panel,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { TableNode } from './TableNode';
import { Table, QueryTable, QueryJoin } from '../../types';
import { Plus, Maximize, Layout, Database, Link } from 'lucide-react';

interface QueryCanvasProps {
  tables: QueryTable[];
  joins: QueryJoin[];
  schemaContext: Table[]; // Available tables from schema
  selectedColumns: Record<string, string[]>; // tableId -> columnNames[]
  onTableAdd: (table: QueryTable) => void;
  onTableRemove: (tableId: string) => void;
  onTablePositionChange: (tableId: string, position: { x: number; y: number }) => void;
  onJoinAdd: (join: QueryJoin) => void;
  onJoinRemove: (joinId: string) => void;
  onColumnToggle: (tableId: string, columnName: string) => void;
}

const nodeTypes = {
  tableNode: TableNode,
};

const QueryCanvasInner: React.FC<QueryCanvasProps> = ({
  tables,
  joins,
  schemaContext,
  selectedColumns,
  onTableAdd,
  onTableRemove,
  onTablePositionChange,
  onJoinAdd,
  onColumnToggle,
}) => {
  const { fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [showTableMenu, setShowTableMenu] = useState(false);

  // Convert QueryTables to ReactFlow nodes
  React.useEffect(() => {
    const flowNodes: Node[] = tables.map((table) => {
      const schemaTable = schemaContext.find(t => t.name === table.tableName);
      const tableSelectedColumns = selectedColumns[table.id] || [];

      return {
        id: table.id,
        type: 'tableNode',
        position: table.position,
        data: {
          table: schemaTable || { name: table.tableName, columns: [], indexes: [], primaryKey: [] },
          selectedColumns: tableSelectedColumns,
          onDelete: () => onTableRemove(table.id),
          onColumnToggle: (columnName: string) => onColumnToggle(table.id, columnName),
          color: table.color,
        },
      };
    });

    setNodes(flowNodes);
  }, [tables, schemaContext, selectedColumns, onTableRemove, onColumnToggle, setNodes]);

  // Convert QueryJoins to ReactFlow edges
  React.useEffect(() => {
    const flowEdges: Edge[] = joins.map((join) => {
      const joinColor = getJoinColor(join.joinType);
      const labelBgColor = getJoinLabelBg(join.joinType);
      
      return {
        id: join.id,
        source: join.fromTableId,
        target: join.toTableId,
        type: 'smoothstep',
        animated: true,
        label: join.joinType,
        labelStyle: { 
          fill: '#ffffff',
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: '0.025em',
        },
        labelBgStyle: {
          fill: labelBgColor,
          fillOpacity: 1,
        },
        labelBgPadding: [8, 5] as [number, number],
        labelBgBorderRadius: 6,
        style: {
          strokeWidth: 2.5,
          stroke: joinColor,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: joinColor,
          width: 20,
          height: 20,
        },
      };
    });

    setEdges(flowEdges);
  }, [joins, setEdges]);

  const getJoinColor = (joinType: QueryJoin['joinType']) => {
    switch (joinType) {
      case 'INNER':
        return '#60a5fa'; // blue-400
      case 'LEFT':
        return '#4ade80'; // green-400
      case 'RIGHT':
        return '#fbbf24'; // amber-400
      case 'FULL':
        return '#a78bfa'; // purple-400
      case 'CROSS':
        return '#f87171'; // red-400
      default:
        return '#9ca3af'; // gray-400
    }
  };

  const getJoinLabelBg = (joinType: QueryJoin['joinType']) => {
    switch (joinType) {
      case 'INNER':
        return '#2563eb'; // blue-600
      case 'LEFT':
        return '#16a34a'; // green-600
      case 'RIGHT':
        return '#d97706'; // amber-600
      case 'FULL':
        return '#7c3aed'; // purple-600
      case 'CROSS':
        return '#dc2626'; // red-600
      default:
        return '#4b5563'; // gray-600
    }
  };

  // Handle node position changes
  const handleNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    onTablePositionChange(node.id, node.position);
  }, [onTablePositionChange]);

  // Handle creating connections (joins)
  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;

    const fromTable = tables.find(t => t.id === connection.source);
    const toTable = tables.find(t => t.id === connection.target);

    if (!fromTable || !toTable) return;

    const fromSchemaTable = schemaContext.find(t => t.name === fromTable.tableName);
    const toSchemaTable = schemaContext.find(t => t.name === toTable.tableName);

    if (!fromSchemaTable || !toSchemaTable) return;

    // Try to find FK relationship
    const fkColumn = fromSchemaTable.columns.find(col => 
      col.references?.table === toTable.tableName
    );

    const newJoin: QueryJoin = {
      id: `join_${Date.now()}`,
      fromTableId: connection.source,
      toTableId: connection.target,
      joinType: 'INNER',
      conditions: fkColumn ? [{
        fromColumn: fkColumn.name,
        toColumn: fkColumn.references!.column,
        operator: '=',
      }] : [],
    };

    onJoinAdd(newJoin);
  }, [tables, schemaContext, onJoinAdd]);

  const handleAddTable = (schemaTable: Table) => {
    const newTable: QueryTable = {
      id: `table_${Date.now()}`,
      tableName: schemaTable.name,
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100,
      },
      selectedColumns: schemaTable.columns.map(c => c.name),
      color: getRandomColor(),
    };

    onTableAdd(newTable);
    setShowTableMenu(false);
  };

  const getRandomColor = () => {
    const colors = ['purple', 'blue', 'green', 'orange', 'pink', 'indigo', 'teal', 'cyan', 'amber'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleAutoLayout = () => {
    const radius = 300;
    const centerX = 400;
    const centerY = 300;

    tables.forEach((table, index) => {
      const angle = (index / tables.length) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      onTablePositionChange(table.id, { x, y });
    });
  };

  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
        }}
      >
        <Background color="#e2e8f0" gap={16} />
        
        <Controls 
          showInteractive={false}
          className="bg-white shadow-lg rounded-lg border border-gray-200"
        />
        
        <MiniMap
          nodeColor={(node) => {
            const color = node.data?.color || 'blue';
            const colorMap: Record<string, string> = {
              purple: '#9333ea',
              blue: '#3b82f6',
              green: '#22c55e',
              orange: '#f97316',
              pink: '#ec4899',
              indigo: '#6366f1',
              teal: '#14b8a6',
              cyan: '#06b6d4',
              amber: '#f59e0b',
            };
            return colorMap[color] || '#3b82f6';
          }}
          className="bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700"
          maskColor="rgb(240, 240, 240, 0.6)"
        />

        {/* Compact Control Panel */}
        <Panel position="top-left">
          <div className="flex items-center gap-1 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1">
            <button
              onClick={() => setShowTableMenu(!showTableMenu)}
              className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded transition-colors"
              title="Add Table"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={handleAutoLayout}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded transition-colors"
              title="Auto Layout"
            >
              <Layout className="w-4 h-4" />
            </button>
            <button
              onClick={() => fitView({ padding: 0.2 })}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded transition-colors"
              title="Fit View"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>

          {/* Table Selection Menu */}
          {showTableMenu && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-[400px] overflow-y-auto w-64">
              <div className="sticky top-0 bg-gray-50 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-600">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Available Tables</h3>
              </div>
              <div className="p-2">
                {schemaContext.map((table) => {
                  const alreadyAdded = tables.some(t => t.tableName === table.name);
                  
                  return (
                    <button
                      key={table.name}
                      onClick={() => !alreadyAdded && handleAddTable(table)}
                      disabled={alreadyAdded}
                      className={`
                        w-full text-left px-3 py-2 rounded-md text-sm transition-colors
                        ${alreadyAdded 
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                          : 'hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-900 dark:text-white'
                        }
                      `}
                    >
                      <div className="font-medium">{table.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{table.columns.length} columns</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Panel>

        {/* Compact Info Panel */}
        <Panel position="top-right">
          <div className="flex items-center gap-3 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs">
              <Database className="w-3.5 h-3.5 text-blue-500" />
              <span className="font-semibold text-gray-900 dark:text-white">{tables.length}</span>
              <span className="text-gray-500 dark:text-gray-400">tables</span>
            </div>
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
            <div className="flex items-center gap-1.5 text-xs">
              <Link className="w-3.5 h-3.5 text-purple-500" />
              <span className="font-semibold text-gray-900 dark:text-white">{joins.length}</span>
              <span className="text-gray-500 dark:text-gray-400">joins</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export const QueryCanvas: React.FC<QueryCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <QueryCanvasInner {...props} />
    </ReactFlowProvider>
  );
};
