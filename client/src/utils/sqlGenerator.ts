import { format } from 'sql-formatter';
import {
  VisualQuery,
  QueryTable,
  SelectedColumn,
  FilterGroup,
  FilterCondition,
  GroupByClause,
  OrderByClause,
  DatabaseType,
} from '../types';

export class SQLGenerator {
  private databaseType: DatabaseType;

  constructor(databaseType: DatabaseType = 'postgresql') {
    this.databaseType = databaseType;
  }

  /**
   * Generate SQL from visual query
   */
  generate(visualQuery: VisualQuery): string {
    const parts: string[] = [];

    // CTEs (WITH clause)
    if (visualQuery.ctes && visualQuery.ctes.length > 0) {
      parts.push(this.generateCTEs(visualQuery.ctes));
    }

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

    const sql = parts.filter(Boolean).join('\n');
    
    // Format SQL for readability
    return format(sql, { 
      language: this.getDatabaseDialect(),
      tabWidth: 2,
      keywordCase: 'upper',
    });
  }

  private getDatabaseDialect(): 'postgresql' | 'mysql' | 'sqlite' | 'sql' {
    switch (this.databaseType) {
      case 'postgresql':
        return 'postgresql';
      case 'mysql':
        return 'mysql';
      case 'sqlite':
        return 'sqlite';
      default:
        return 'sql';
    }
  }

  private generateCTEs(ctes: VisualQuery['ctes']): string {
    if (!ctes || ctes.length === 0) return '';

    const cteStatements = ctes.map(cte => {
      const cteSQL = this.generate(cte.query);
      return `${cte.name} AS (\n${cteSQL}\n)`;
    });

    return `WITH ${cteStatements.join(',\n')}`;
  }

  private generateSelect(visualQuery: VisualQuery): string {
    const { selectedColumns, tables, distinct } = visualQuery;

    if (selectedColumns.length === 0) {
      return 'SELECT *';
    }

    const distinctKeyword = distinct ? 'DISTINCT ' : '';
    const columns = selectedColumns.map(col => this.formatSelectedColumn(col, tables));

    return `SELECT ${distinctKeyword}${columns.join(',\n       ')}`;
  }

  private formatSelectedColumn(column: SelectedColumn, tables: QueryTable[]): string {
    const table = tables.find(t => t.id === column.tableId);
    if (!table) return column.columnName;

    const tableRef = table.alias || table.tableName;
    let columnStr = '';

    // Handle expressions
    if (column.expression) {
      columnStr = column.expression;
    }
    // Handle aggregate functions
    else if (column.aggregateFunction) {
      const funcName = column.aggregateFunction === 'COUNT_DISTINCT' ? 'COUNT(DISTINCT' : column.aggregateFunction;
      const closeParen = column.aggregateFunction === 'COUNT_DISTINCT' ? ')' : '';
      columnStr = `${funcName}(${tableRef}.${column.columnName}${closeParen})`;
    }
    // Regular column
    else {
      columnStr = `${tableRef}.${column.columnName}`;
    }

    // Add alias if specified
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

    // Use the first table as the main FROM table
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

  private generateFilterGroup(filterGroup: FilterGroup, tables: QueryTable[], level = 0): string {
    if (!filterGroup.conditions || filterGroup.conditions.length === 0) {
      return '';
    }

    const conditions = filterGroup.conditions.map(condition => {
      if ('isGroup' in condition && condition.isGroup) {
        const groupCondition = this.generateFilterGroup(condition as FilterGroup, tables, level + 1);
        return groupCondition ? `(${groupCondition})` : '';
      } else {
        return this.generateFilterCondition(condition as FilterCondition, tables);
      }
    }).filter(Boolean);

    if (conditions.length === 0) return '';

    const joined = conditions.join(` ${filterGroup.operator} `);
    return level > 0 ? joined : joined;
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
      case 'LIKE':
      case 'NOT LIKE':
        return `${column} ${condition.operator} ${this.formatValue(condition.value)}`;
      default:
        return `${column} ${condition.operator} ${this.formatValue(condition.value)}`;
    }
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'string') {
      // Escape single quotes
      const escaped = value.replace(/'/g, "''");
      return `'${escaped}'`;
    }
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }
    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }
    return String(value);
  }

  private generateGroupBy(groupBy: GroupByClause, tables: QueryTable[]): string {
    const columns = groupBy.columns.map(col => {
      const table = tables.find(t => t.id === col.tableId);
      if (!table) return col.columnName;
      const tableRef = table.alias || table.tableName;
      return `${tableRef}.${col.columnName}`;
    });

    let result = `GROUP BY ${columns.join(', ')}`;

    // Add HAVING clause if present
    if (groupBy.having && groupBy.having.conditions.length > 0) {
      const havingCondition = this.generateFilterGroup(groupBy.having, tables);
      if (havingCondition) {
        result += `\nHAVING ${havingCondition}`;
      }
    }

    return result;
  }

  private generateOrderBy(orderBy: OrderByClause[], tables: QueryTable[]): string {
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
      // SQL Server uses OFFSET FETCH
      if (offset !== undefined && offset > 0) {
        result = `OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
      } else {
        result = `OFFSET 0 ROWS FETCH NEXT ${limit} ROWS ONLY`;
      }
    }

    return result;
  }

  /**
   * Validate visual query before generating SQL
   */
  validate(visualQuery: VisualQuery): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Guard against undefined visualQuery
    if (!visualQuery) {
      errors.push('Query is undefined');
      return { valid: false, errors };
    }

    // Check if there are tables
    if (!visualQuery.tables || visualQuery.tables.length === 0) {
      errors.push('Query must have at least one table');
    }

    // Check if there are selected columns
    if (!visualQuery.selectedColumns || visualQuery.selectedColumns.length === 0) {
      // This is a warning, not an error (SELECT * is valid)
    }

    // Validate joins
    if (visualQuery.joins && Array.isArray(visualQuery.joins)) {
      visualQuery.joins.forEach((join, index) => {
        const tables = visualQuery.tables || [];
        const fromTable = tables.find(t => t.id === join.fromTableId);
        const toTable = tables.find(t => t.id === join.toTableId);

        if (!fromTable) {
          errors.push(`Join ${index + 1}: Source table not found`);
        }
        if (!toTable) {
          errors.push(`Join ${index + 1}: Target table not found`);
        }
        if (!join.conditions || join.conditions.length === 0) {
          errors.push(`Join ${index + 1}: No join conditions specified`);
        }
      });
    }

    // Validate GROUP BY
    if (visualQuery.groupBy && visualQuery.groupBy.columns && visualQuery.groupBy.columns.length === 0) {
      errors.push('GROUP BY specified but no columns selected');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
