export type JoinType = 
  | 'INNER' 
  | 'LEFT' 
  | 'LEFT OUTER' 
  | 'RIGHT' 
  | 'RIGHT OUTER' 
  | 'FULL' 
  | 'FULL OUTER' 
  | 'CROSS' 
  | 'SELF' 
  | 'NATURAL' 
  | 'LEFT ANTI' 
  | 'RIGHT ANTI' 
  | 'LEFT SEMI' 
  | 'RIGHT SEMI';

export type FilterOperator = 
  | '=' 
  | '!=' 
  | '>' 
  | '<' 
  | '>=' 
  | '<=' 
  | 'LIKE' 
  | 'NOT LIKE' 
  | 'IN' 
  | 'NOT IN' 
  | 'BETWEEN' 
  | 'NOT BETWEEN'
  | 'IS NULL' 
  | 'IS NOT NULL'
  | 'EXISTS'
  | 'NOT EXISTS'
  | 'ALL'
  | 'ANY'
  | 'SOME';

export type LogicalOperator = 'AND' | 'OR' | 'NOT';
export type AggregateFunction = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT_DISTINCT';
export type SortDirection = 'ASC' | 'DESC';

export interface QueryTable {
  id: string;
  tableName: string;
  alias?: string;
  position: { x: number; y: number };
  selectedColumns: string[];
  color?: string;
}

export interface SelectedColumn {
  tableId: string;
  columnName: string;
  alias?: string;
  aggregateFunction?: AggregateFunction;
  expression?: string; // For computed columns
}

export interface JoinCondition {
  fromColumn: string;
  toColumn: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=';
}

export interface QueryJoin {
  id: string;
  fromTableId: string;
  toTableId: string;
  joinType: JoinType;
  conditions: JoinCondition[];
}

export interface FilterCondition {
  id: string;
  column: string;
  tableId: string;
  operator: FilterOperator;
  value: any;
  value2?: any; // For BETWEEN
}

export interface FilterGroup {
  id: string;
  operator: LogicalOperator;
  conditions: (FilterCondition | FilterGroup)[];
  isGroup: boolean;
}

export interface GroupByClause {
  columns: Array<{ tableId: string; columnName: string }>;
  having?: FilterGroup;
}

export interface OrderByClause {
  tableId: string;
  columnName: string;
  direction: SortDirection;
}

export interface Subquery {
  id: string;
  name: string;
  query: VisualQuery;
  usedIn: 'SELECT' | 'FROM' | 'WHERE';
}

export interface CTE {
  id: string;
  name: string;
  query: VisualQuery;
  recursive?: boolean;
}

export interface UnionClause {
  id: string;
  query: VisualQuery;
  unionType: 'UNION' | 'UNION ALL' | 'INTERSECT' | 'EXCEPT';
}

export interface WindowFunction {
  id: string;
  function: 'ROW_NUMBER' | 'RANK' | 'DENSE_RANK' | 'LAG' | 'LEAD' | 'NTILE' | 'FIRST_VALUE' | 'LAST_VALUE';
  partitionBy?: string[];
  orderBy?: OrderByClause[];
  frameStart?: string;
  frameEnd?: string;
  alias: string;
}

export interface VisualQuery {
  id?: string;
  name: string;
  description?: string;
  queryType?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'DROP' | 'ALTER';
  tables: QueryTable[];
  joins: QueryJoin[];
  selectedColumns: SelectedColumn[];
  filters?: FilterGroup;
  groupBy?: GroupByClause;
  orderBy?: OrderByClause[];
  limit?: number;
  offset?: number;
  distinct?: boolean;
  subqueries?: Subquery[];
  ctes?: CTE[];
  unions?: UnionClause[];
  windowFunctions?: WindowFunction[];
  // DML Operations
  into?: string; // SELECT INTO table
  insertInto?: {
    table: string;
    columns?: string[];
  };
  updateTable?: {
    table: string;
    setColumns: Array<{ column: string; value: any; expression?: string }>;
  };
  deleteFrom?: string;
  // DDL Operations
  createTable?: {
    name: string;
    ifNotExists?: boolean;
    temporary?: boolean;
    columns?: Array<{
      name: string;
      type: string;
      nullable?: boolean;
      primaryKey?: boolean;
      unique?: boolean;
      default?: any;
      check?: string;
    }>;
  };
  alterTable?: {
    table: string;
    action: 'ADD' | 'DROP' | 'MODIFY' | 'RENAME';
    column?: { name: string; type?: string };
    constraint?: { name: string; type: string; definition?: string };
  };
  dropTable?: {
    table: string;
    ifExists?: boolean;
    cascade?: boolean;
  };
  truncateTable?: string;
  // Row Locking
  for?: 'UPDATE' | 'SHARE';
  // Metadata
  createdAt?: string;
  updatedAt?: string;
}

export interface VisualQueryHistory {
  id: string;
  name: string;
  description?: string;
  visualQuery: VisualQuery;
  generatedSQL: string;
  databaseType: string;
  schemaContext?: any;
  status: 'success' | 'error';
  error?: string;
  executionTime?: number;
  rowCount?: number;
  createdAt: string;
}

export interface QueryExecutionResult {
  columns: string[];
  rows: any[];
  rowCount: number;
  executionTime: number;
  error?: string;
}
