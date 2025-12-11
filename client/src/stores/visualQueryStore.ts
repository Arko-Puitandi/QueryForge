import { create } from 'zustand';
import { VisualQuery, QueryTable, SelectedColumn, QueryJoin, FilterGroup, FilterCondition, GroupByClause, OrderByClause } from '../types';

interface VisualQueryState {
  currentQuery: VisualQuery;
  savedQueries: VisualQuery[];
  isLoading: boolean;
  error: string | null;

  // Query manipulation
  setQueryName: (name: string) => void;
  setQueryDescription: (description: string) => void;
  
  // Table operations
  addTable: (table: QueryTable) => void;
  removeTable: (tableId: string) => void;
  updateTablePosition: (tableId: string, position: { x: number; y: number }) => void;
  updateTableAlias: (tableId: string, alias: string) => void;
  
  // Column selection
  toggleColumnSelection: (tableId: string, columnName: string) => void;
  selectAllColumns: (tableId: string) => void;
  deselectAllColumns: (tableId: string) => void;
  addComputedColumn: (column: SelectedColumn) => void;
  removeSelectedColumn: (tableId: string, columnName: string) => void;
  updateColumnAlias: (tableId: string, columnName: string, alias: string) => void;
  updateColumnAggregateFunction: (tableId: string, columnName: string, func: SelectedColumn['aggregateFunction']) => void;
  
  // Join operations
  addJoin: (join: QueryJoin) => void;
  removeJoin: (joinId: string) => void;
  updateJoin: (joinId: string, updates: Partial<QueryJoin>) => void;
  updateJoinType: (joinId: string, joinType: QueryJoin['joinType']) => void;
  
  // Filter operations
  setFilters: (filters: FilterGroup) => void;
  addFilter: (filter: FilterCondition) => void;
  removeFilter: (filterId: string) => void;
  updateFilter: (filterId: string, updates: Partial<FilterCondition>) => void;
  
  // GROUP BY operations
  setGroupBy: (groupBy: GroupByClause | undefined) => void;
  addGroupByColumn: (tableId: string, columnName: string) => void;
  removeGroupByColumn: (tableId: string, columnName: string) => void;
  
  // ORDER BY operations
  addOrderBy: (orderBy: OrderByClause) => void;
  removeOrderBy: (tableId: string, columnName: string) => void;
  updateOrderByDirection: (tableId: string, columnName: string, direction: OrderByClause['direction']) => void;
  
  // Query options
  setDistinct: (distinct: boolean) => void;
  setLimit: (limit: number | undefined) => void;
  setOffset: (offset: number | undefined) => void;
  
  // Save/Load
  saveQuery: () => void;
  loadQuery: (query: VisualQuery) => void;
  resetQuery: () => void;
  
  // Utility
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

const createEmptyQuery = (): VisualQuery => ({
  name: 'Untitled Query',
  description: '',
  tables: [],
  joins: [],
  selectedColumns: [],
  filters: {
    id: 'root',
    operator: 'AND',
    conditions: [],
    isGroup: true,
  },
  orderBy: [],
  distinct: false,
});

export const useVisualQueryStore = create<VisualQueryState>((set, _get) => ({
  currentQuery: createEmptyQuery(),
  savedQueries: [],
  isLoading: false,
  error: null,

  setQueryName: (name) => set((state) => ({
    currentQuery: { ...state.currentQuery, name },
  })),

  setQueryDescription: (description) => set((state) => ({
    currentQuery: { ...state.currentQuery, description },
  })),

  // Table operations
  addTable: (table) => set((state) => ({
    currentQuery: {
      ...state.currentQuery,
      tables: [...state.currentQuery.tables, table],
    },
  })),

  removeTable: (tableId) => set((state) => ({
    currentQuery: {
      ...state.currentQuery,
      tables: state.currentQuery.tables.filter(t => t.id !== tableId),
      joins: state.currentQuery.joins.filter(j => j.fromTableId !== tableId && j.toTableId !== tableId),
      selectedColumns: state.currentQuery.selectedColumns.filter(c => c.tableId !== tableId),
    },
  })),

  updateTablePosition: (tableId, position) => set((state) => ({
    currentQuery: {
      ...state.currentQuery,
      tables: state.currentQuery.tables.map(t => 
        t.id === tableId ? { ...t, position } : t
      ),
    },
  })),

  updateTableAlias: (tableId, alias) => set((state) => ({
    currentQuery: {
      ...state.currentQuery,
      tables: state.currentQuery.tables.map(t =>
        t.id === tableId ? { ...t, alias } : t
      ),
    },
  })),

  // Column selection
  toggleColumnSelection: (tableId, columnName) => set((state) => {
    const existing = state.currentQuery.selectedColumns.find(
      c => c.tableId === tableId && c.columnName === columnName
    );

    if (existing) {
      return {
        currentQuery: {
          ...state.currentQuery,
          selectedColumns: state.currentQuery.selectedColumns.filter(
            c => !(c.tableId === tableId && c.columnName === columnName)
          ),
        },
      };
    } else {
      return {
        currentQuery: {
          ...state.currentQuery,
          selectedColumns: [
            ...state.currentQuery.selectedColumns,
            { tableId, columnName },
          ],
        },
      };
    }
  }),

  selectAllColumns: (tableId) => set((state) => {
    const table = state.currentQuery.tables.find(t => t.id === tableId);
    if (!table) return state;

    const newColumns = table.selectedColumns.map(columnName => ({
      tableId,
      columnName,
    }));

    const otherColumns = state.currentQuery.selectedColumns.filter(c => c.tableId !== tableId);

    return {
      currentQuery: {
        ...state.currentQuery,
        selectedColumns: [...otherColumns, ...newColumns],
      },
    };
  }),

  deselectAllColumns: (tableId) => set((state) => ({
    currentQuery: {
      ...state.currentQuery,
      selectedColumns: state.currentQuery.selectedColumns.filter(c => c.tableId !== tableId),
    },
  })),

  addComputedColumn: (column) => set((state) => ({
    currentQuery: {
      ...state.currentQuery,
      selectedColumns: [...state.currentQuery.selectedColumns, column],
    },
  })),

  removeSelectedColumn: (tableId, columnName) => set((state) => ({
    currentQuery: {
      ...state.currentQuery,
      selectedColumns: state.currentQuery.selectedColumns.filter(
        c => !(c.tableId === tableId && c.columnName === columnName)
      ),
    },
  })),

  updateColumnAlias: (tableId, columnName, alias) => set((state) => ({
    currentQuery: {
      ...state.currentQuery,
      selectedColumns: state.currentQuery.selectedColumns.map(c =>
        c.tableId === tableId && c.columnName === columnName
          ? { ...c, alias }
          : c
      ),
    },
  })),

  updateColumnAggregateFunction: (tableId, columnName, func) => set((state) => ({
    currentQuery: {
      ...state.currentQuery,
      selectedColumns: state.currentQuery.selectedColumns.map(c =>
        c.tableId === tableId && c.columnName === columnName
          ? { ...c, aggregateFunction: func }
          : c
      ),
    },
  })),

  // Join operations
  addJoin: (join) => set((state) => ({
    currentQuery: {
      ...state.currentQuery,
      joins: [...state.currentQuery.joins, join],
    },
  })),

  removeJoin: (joinId) => set((state) => ({
    currentQuery: {
      ...state.currentQuery,
      joins: state.currentQuery.joins.filter(j => j.id !== joinId),
    },
  })),

  updateJoin: (joinId, updates) => set((state) => ({
    currentQuery: {
      ...state.currentQuery,
      joins: state.currentQuery.joins.map(j =>
        j.id === joinId ? { ...j, ...updates } : j
      ),
    },
  })),

  updateJoinType: (joinId, joinType) => set((state) => ({
    currentQuery: {
      ...state.currentQuery,
      joins: state.currentQuery.joins.map(j =>
        j.id === joinId ? { ...j, joinType } : j
      ),
    },
  })),

  // Filter operations
  setFilters: (filters) => set((state) => ({
    currentQuery: { ...state.currentQuery, filters },
  })),

  addFilter: (filter) => set((state) => {
    const filters = state.currentQuery.filters || {
      id: 'root',
      operator: 'AND',
      conditions: [],
      isGroup: true,
    };

    return {
      currentQuery: {
        ...state.currentQuery,
        filters: {
          ...filters,
          conditions: [...filters.conditions, filter],
        },
      },
    };
  }),

  removeFilter: (filterId) => set((state) => {
    if (!state.currentQuery.filters) return state;

    const removeFilterRecursive = (group: FilterGroup): FilterGroup => ({
      ...group,
      conditions: group.conditions
        .filter(c => c.id !== filterId)
        .map(c => 'isGroup' in c && c.isGroup ? removeFilterRecursive(c as FilterGroup) : c),
    });

    return {
      currentQuery: {
        ...state.currentQuery,
        filters: removeFilterRecursive(state.currentQuery.filters),
      },
    };
  }),

  updateFilter: (filterId, updates) => set((state) => {
    if (!state.currentQuery.filters) return state;

    const updateFilterRecursive = (group: FilterGroup): FilterGroup => ({
      ...group,
      conditions: group.conditions.map(c => {
        if ('isGroup' in c && c.isGroup) {
          return updateFilterRecursive(c as FilterGroup);
        } else if (c.id === filterId) {
          return { ...c, ...updates } as FilterCondition | FilterGroup;
        }
        return c;
      }) as (FilterCondition | FilterGroup)[],
    });

    return {
      currentQuery: {
        ...state.currentQuery,
        filters: updateFilterRecursive(state.currentQuery.filters),
      },
    };
  }),

  // GROUP BY operations
  setGroupBy: (groupBy) => set((state) => ({
    currentQuery: { ...state.currentQuery, groupBy },
  })),

  addGroupByColumn: (tableId, columnName) => set((state) => {
    const groupBy = state.currentQuery.groupBy || {
      columns: [],
    };

    return {
      currentQuery: {
        ...state.currentQuery,
        groupBy: {
          ...groupBy,
          columns: [...groupBy.columns, { tableId, columnName }],
        },
      },
    };
  }),

  removeGroupByColumn: (tableId, columnName) => set((state) => {
    if (!state.currentQuery.groupBy) return state;

    return {
      currentQuery: {
        ...state.currentQuery,
        groupBy: {
          ...state.currentQuery.groupBy,
          columns: state.currentQuery.groupBy.columns.filter(
            c => !(c.tableId === tableId && c.columnName === columnName)
          ),
        },
      },
    };
  }),

  // ORDER BY operations
  addOrderBy: (orderBy) => set((state) => ({
    currentQuery: {
      ...state.currentQuery,
      orderBy: [...(state.currentQuery.orderBy || []), orderBy],
    },
  })),

  removeOrderBy: (tableId, columnName) => set((state) => ({
    currentQuery: {
      ...state.currentQuery,
      orderBy: state.currentQuery.orderBy?.filter(
        o => !(o.tableId === tableId && o.columnName === columnName)
      ),
    },
  })),

  updateOrderByDirection: (tableId, columnName, direction) => set((state) => ({
    currentQuery: {
      ...state.currentQuery,
      orderBy: state.currentQuery.orderBy?.map(o =>
        o.tableId === tableId && o.columnName === columnName
          ? { ...o, direction }
          : o
      ),
    },
  })),

  // Query options
  setDistinct: (distinct) => set((state) => ({
    currentQuery: { ...state.currentQuery, distinct },
  })),

  setLimit: (limit) => set((state) => ({
    currentQuery: { ...state.currentQuery, limit },
  })),

  setOffset: (offset) => set((state) => ({
    currentQuery: { ...state.currentQuery, offset },
  })),

  // Save/Load
  saveQuery: () => set((state) => {
    const query = {
      ...state.currentQuery,
      id: state.currentQuery.id || `query_${Date.now()}`,
      createdAt: state.currentQuery.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const savedQueries = state.savedQueries.filter(q => q.id !== query.id);

    return {
      currentQuery: query,
      savedQueries: [...savedQueries, query],
    };
  }),

  loadQuery: (query) => set({
    currentQuery: query,
  }),

  resetQuery: () => set({
    currentQuery: createEmptyQuery(),
    error: null,
  }),

  // Utility
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
