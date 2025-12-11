import type { DatabaseType } from '../types';

interface QueryTable {
  id: string;
  tableName: string;
  alias?: string;
  position: { x: number; y: number };
  selectedColumns: string[];
}

interface SelectedColumn {
  tableId: string;
  columnName: string;
  alias?: string;
  aggregateFunction?: string;
  expression?: string;
}

interface QueryJoin {
  id: string;
  fromTableId: string;
  toTableId: string;
  joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS';
  conditions: Array<{
    fromColumn: string;
    toColumn: string;
    operator: string;
  }>;
}

interface FilterCondition {
  id: string;
  column: string;
  tableId: string;
  operator: string;
  value: any;
  value2?: any;
}

interface FilterGroup {
  id: string;
  operator: 'AND' | 'OR';
  conditions: (FilterCondition | FilterGroup)[];
  isGroup: boolean;
}

interface VisualQuery {
  name: string;
  description?: string;
  tables: QueryTable[];
  joins: QueryJoin[];
  selectedColumns: SelectedColumn[];
  filters?: FilterGroup;
  groupBy?: {
    columns: Array<{ tableId: string; columnName: string }>;
    having?: FilterGroup;
  };
  orderBy?: Array<{
    tableId: string;
    columnName: string;
    direction: 'ASC' | 'DESC';
  }>;
  limit?: number;
  offset?: number;
  distinct?: boolean;
}

export class SQLGeneratorBackend {
  private databaseType: DatabaseType;

  constructor(databaseType: DatabaseType = 'postgresql') {
    this.databaseType = databaseType;
  }

  generate(visualQuery: VisualQuery): string {
    const parts: string[] = [];

    // SELECT clause
    parts.push(this.generateSelect(visualQuery));

    // FROM clause
    parts.push(this.generateFrom(visualQuery));

    // JOINs
    if (visualQuery.joins && visualQuery.joins.length > 0) {
      parts.push(this.generateJoins(visualQuery));
    }

    // WHERE clause
    if (visualQuery.filters && visualQuery.filters.conditions.length > 0) {
      parts.push(this.generateWhere(visualQuery.filters, visualQuery.tables));
    }

    // GROUP BY clause
    if (visualQuery.groupBy) {
      parts.push(this.generateGroupBy(visualQuery.groupBy, visualQuery.tables));
    }

    // ORDER BY clause
    if (visualQuery.orderBy && visualQuery.orderBy.length > 0) {
      parts.push(this.generateOrderBy(visualQuery.orderBy, visualQuery.tables));
    }

    // LIMIT and OFFSET
    if (visualQuery.limit !== undefined) {
      parts.push(this.generateLimit(visualQuery.limit, visualQuery.offset));
    }

    return parts.filter(Boolean).join('\n');
  }

  private generateSelect(visualQuery: VisualQuery): string {
    const { selectedColumns, tables, distinct } = visualQuery;

    if (selectedColumns.length === 0) {
      return 'SELECT *';
    }

    const distinctKeyword = distinct ? 'DISTINCT ' : '';
    const columns = selectedColumns.map(col => this.formatSelectedColumn(col, tables));

    return `SELECT ${distinctKeyword}${columns.join(', ')}`;
  }

  private formatSelectedColumn(column: SelectedColumn, tables: QueryTable[]): string {
    const table = tables.find(t => t.id === column.tableId);
    if (!table) return column.columnName;

    const tableRef = table.alias || table.tableName;
    let columnStr = '';

    if (column.expression) {
      columnStr = column.expression;
    } else if (column.aggregateFunction) {
      const funcName = column.aggregateFunction === 'COUNT_DISTINCT' ? 'COUNT(DISTINCT' : column.aggregateFunction;
      const closeParen = column.aggregateFunction === 'COUNT_DISTINCT' ? ')' : '';
      columnStr = `${funcName}(${tableRef}.${column.columnName}${closeParen})`;
    } else {
      columnStr = `${tableRef}.${column.columnName}`;
    }

    if (column.alias) {
      columnStr += ` AS ${column.alias}`;
    }

    return columnStr;
  }

  private generateFrom(visualQuery: VisualQuery): string {
    const { tables } = visualQuery;

    if (tables.length === 0) {
      throw new Error('No tables specified in query');
    }

    const mainTable = tables[0];
    const tableRef = mainTable.alias 
      ? `${mainTable.tableName} AS ${mainTable.alias}`
      : mainTable.tableName;

    return `FROM ${tableRef}`;
  }

  private generateJoins(visualQuery: VisualQuery): string {
    const { joins, tables } = visualQuery;

    return joins.map(join => {
      const fromTable = tables.find(t => t.id === join.fromTableId);
      const toTable = tables.find(t => t.id === join.toTableId);

      if (!fromTable || !toTable) return '';

      const toTableRef = toTable.alias || toTable.tableName;
      const fromTableRef = fromTable.alias || fromTable.tableName;
      const toTableName = toTable.alias ? `${toTable.tableName} AS ${toTable.alias}` : toTable.tableName;

      const conditions = join.conditions.map(condition => {
        return `${fromTableRef}.${condition.fromColumn} ${condition.operator} ${toTableRef}.${condition.toColumn}`;
      }).join(' AND ');

      return `${join.joinType} JOIN ${toTableName} ON ${conditions}`;
    }).join('\n');
  }

  private generateWhere(filterGroup: FilterGroup, tables: QueryTable[]): string {
    const condition = this.generateFilterGroup(filterGroup, tables);
    return condition ? `WHERE ${condition}` : '';
  }

  private generateFilterGroup(filterGroup: FilterGroup, tables: QueryTable[]): string {
    if (!filterGroup.conditions || filterGroup.conditions.length === 0) {
      return '';
    }

    const conditions = filterGroup.conditions.map(condition => {
      if ('isGroup' in condition && condition.isGroup) {
        const groupCondition = this.generateFilterGroup(condition as FilterGroup, tables);
        return groupCondition ? `(${groupCondition})` : '';
      } else {
        return this.generateFilterCondition(condition as FilterCondition, tables);
      }
    }).filter(Boolean);

    if (conditions.length === 0) return '';

    return conditions.join(` ${filterGroup.operator} `);
  }

  private generateFilterCondition(condition: FilterCondition, tables: QueryTable[]): string {
    const table = tables.find(t => t.id === condition.tableId);
    if (!table) return '';

    const tableRef = table.alias || table.tableName;
    const column = `${tableRef}.${condition.column}`;

    switch (condition.operator) {
      case 'IS NULL':
        return `${column} IS NULL`;
      case 'IS NOT NULL':
        return `${column} IS NOT NULL`;
      case 'BETWEEN':
        return `${column} BETWEEN ${this.formatValue(condition.value)} AND ${this.formatValue(condition.value2)}`;
      case 'IN':
      case 'NOT IN':
        const values = Array.isArray(condition.value) 
          ? condition.value.map(v => this.formatValue(v)).join(', ')
          : this.formatValue(condition.value);
        return `${column} ${condition.operator} (${values})`;
      default:
        return `${column} ${condition.operator} ${this.formatValue(condition.value)}`;
    }
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'string') {
      const escaped = value.replace(/'/g, "''");
      return `'${escaped}'`;
    }
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }
    return String(value);
  }

  private generateGroupBy(groupBy: any, tables: QueryTable[]): string {
    const columns = groupBy.columns.map((col: any) => {
      const table = tables.find(t => t.id === col.tableId);
      if (!table) return col.columnName;
      const tableRef = table.alias || table.tableName;
      return `${tableRef}.${col.columnName}`;
    });

    let result = `GROUP BY ${columns.join(', ')}`;

    if (groupBy.having && groupBy.having.conditions.length > 0) {
      const havingCondition = this.generateFilterGroup(groupBy.having, tables);
      if (havingCondition) {
        result += `\nHAVING ${havingCondition}`;
      }
    }

    return result;
  }

  private generateOrderBy(orderBy: any[], tables: QueryTable[]): string {
    const columns = orderBy.map(order => {
      const table = tables.find(t => t.id === order.tableId);
      if (!table) return `${order.columnName} ${order.direction}`;
      const tableRef = table.alias || table.tableName;
      return `${tableRef}.${order.columnName} ${order.direction}`;
    });

    return `ORDER BY ${columns.join(', ')}`;
  }

  private generateLimit(limit: number, offset?: number): string {
    let result = '';

    if (this.databaseType === 'mysql' || this.databaseType === 'postgresql' || this.databaseType === 'sqlite') {
      result = `LIMIT ${limit}`;
      if (offset !== undefined && offset > 0) {
        result += ` OFFSET ${offset}`;
      }
    } else if (this.databaseType === 'sqlserver') {
      if (offset !== undefined && offset > 0) {
        result = `OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
      } else {
        result = `OFFSET 0 ROWS FETCH NEXT ${limit} ROWS ONLY`;
      }
    }

    return result;
  }
}
