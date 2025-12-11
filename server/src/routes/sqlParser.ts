import { Router } from 'express';

const router = Router();

// Parse SQL and convert to Visual Query
router.post('/parse', async (req, res) => {
  try {
    const { sql, schemaContext } = req.body;

    if (!sql) {
      return res.status(400).json({
        success: false,
        error: { message: 'SQL query is required' },
      });
    }

    const parsedQuery = parseSQL(sql, schemaContext || []);

    res.json({
      success: true,
      data: parsedQuery,
    });
  } catch (error: any) {
    console.error('SQL parsing error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to parse SQL',
        code: 'PARSE_ERROR',
      },
    });
  }
});

// Validate SQL syntax
router.post('/validate', async (req, res) => {
  try {
    const { sql } = req.body;

    if (!sql) {
      return res.status(400).json({
        success: false,
        error: { message: 'SQL query is required' },
      });
    }

    const validation = validateSQL(sql);

    res.json({
      success: true,
      data: validation,
    });
  } catch (error: any) {
    console.error('SQL validation error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to validate SQL',
        code: 'VALIDATION_ERROR',
      },
    });
  }
});

// Helper: Parse SQL to Visual Query
function parseSQL(sql: string, schemaContext: any[]): any {
  const sqlLower = sql.toLowerCase().trim();
  
  // Detect query type
  let queryType = 'SELECT';
  if (sqlLower.startsWith('insert')) queryType = 'INSERT';
  else if (sqlLower.startsWith('update')) queryType = 'UPDATE';
  else if (sqlLower.startsWith('delete')) queryType = 'DELETE';
  else if (sqlLower.startsWith('create')) queryType = 'CREATE';
  else if (sqlLower.startsWith('alter')) queryType = 'ALTER';
  else if (sqlLower.startsWith('drop')) queryType = 'DROP';
  else if (sqlLower.startsWith('truncate')) queryType = 'TRUNCATE';

  const query: any = {
    name: 'Imported SQL Query',
    description: `Imported ${queryType} query from SQL`,
    queryType,
    tables: [],
    joins: [],
    selectedColumns: [],
    filters: {
      id: 'root',
      logicalOperator: 'AND',
      conditions: [],
      isGroup: true,
    },
    orderBy: [],
    distinct: sqlLower.includes('select distinct'),
  };

  // Handle SELECT queries
  if (queryType === 'SELECT') {
    // Extract FROM clause FIRST - store base timestamp for consistent IDs
    const baseTimestamp = Date.now();
    const fromMatch = sql.match(/FROM\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/i);
    let firstTableId = '';
    
    // Map to track table name/alias to ID
    const tableIdMap: Record<string, string> = {};
    
    if (fromMatch) {
      const tableName = fromMatch[1];
      const alias = fromMatch[2];
      firstTableId = `table_${baseTimestamp}`;
      
      // Map both table name and alias to the ID
      tableIdMap[tableName.toLowerCase()] = firstTableId;
      if (alias) {
        tableIdMap[alias.toLowerCase()] = firstTableId;
      }
      
      query.tables.push({
        id: firstTableId,
        tableName: tableName,
        alias: alias,
        position: { x: 100, y: 100 },
        selectedColumns: [],
      });
    }

    // Extract JOINs - Enhanced to support all join types
    const joinRegex = /(INNER|LEFT(?:\s+OUTER)?|RIGHT(?:\s+OUTER)?|FULL(?:\s+OUTER)?|CROSS|NATURAL|LEFT\s+ANTI|RIGHT\s+ANTI|LEFT\s+SEMI|RIGHT\s+SEMI)?\s*JOIN\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?(?:\s+ON\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+))?/gi;
    let joinMatch;
    let joinIndex = 0;
    
    while ((joinMatch = joinRegex.exec(sql)) !== null) {
      const joinType = (joinMatch[1] || 'INNER').toUpperCase().trim();
      const rightTable = joinMatch[2];
      const alias = joinMatch[3];
      const leftTableAlias = joinMatch[4];
      const leftColumn = joinMatch[5];
      const rightTableAlias = joinMatch[6];
      const rightColumn = joinMatch[7];

      const newTableId = `table_${baseTimestamp + joinIndex + 1}`;
      
      // Map the new table name and alias to its ID
      tableIdMap[rightTable.toLowerCase()] = newTableId;
      if (alias) {
        tableIdMap[alias.toLowerCase()] = newTableId;
      }

      query.tables.push({
        id: newTableId,
        tableName: rightTable,
        alias: alias,
        position: { x: 100 + (joinIndex + 1) * 300, y: 100 },
        selectedColumns: [],
      });

      // Find the source table ID from the leftTableAlias
      const fromTableId = tableIdMap[leftTableAlias?.toLowerCase()] || firstTableId;
      // Find the target table ID from rightTableAlias or alias or table name
      const toTableId = newTableId;

      query.joins.push({
        id: `join_${baseTimestamp + joinIndex}`,
        fromTableId: fromTableId,
        toTableId: toTableId,
        joinType: joinType.replace(' OUTER', ''),
        conditions: [{
          fromColumn: leftColumn || '',
          toColumn: rightColumn || '',
          operator: '=',
        }],
      });

    joinIndex++;
  }

  // Extract SELECT columns (after tables are parsed so we have tableIdMap)
  const selectMatch = sql.match(/SELECT\s+(DISTINCT\s+)?([\s\S]*?)\s+FROM/i);
  if (selectMatch) {
    const columnsText = selectMatch[2];
    if (columnsText.trim() !== '*') {
      const columns = columnsText.split(',').map(c => c.trim());
      columns.forEach((col) => {
        // Handle table.column format
        const tableColMatch = col.match(/^(\w+)\.(\w+)(?:\s+(?:AS\s+)?(\w+))?$/i);
        // Handle column AS alias format
        const aliasMatch = col.match(/^(\w+)(?:\s+(?:AS\s+)?(\w+))?$/i);
        
        if (tableColMatch) {
          // Format: table.column or table.column AS alias
          const tableName = tableColMatch[1];
          const columnName = tableColMatch[2];
          const alias = tableColMatch[3];
          const tableId = tableIdMap[tableName.toLowerCase()] || firstTableId;
          
          query.selectedColumns.push({
            tableId,
            columnName,
            alias,
          });
        } else if (aliasMatch) {
          // Format: column or column AS alias (assume first table)
          const columnName = aliasMatch[1];
          const alias = aliasMatch[2];
          
          query.selectedColumns.push({
            tableId: firstTableId,
            columnName,
            alias,
          });
        }
      });
    } else {
      // SELECT * - add all columns from all tables to selectedColumns
      // For now, just mark that all columns should be selected
      query.tables.forEach(table => {
        table.selectedColumns = ['*'];
      });
    }
  }

  // Extract WHERE clause
  const whereMatch = sql.match(/WHERE\s+([\s\S]*?)(?:GROUP BY|ORDER BY|LIMIT|$)/i);
  if (whereMatch) {
    const whereClause = whereMatch[1].trim();
    parseWhereClause(whereClause, query.filters);
  }

  // Extract ORDER BY
  const orderByMatch = sql.match(/ORDER BY\s+([\s\S]*?)(?:LIMIT|$)/i);
  if (orderByMatch) {
    const orderByText = orderByMatch[1].trim();
    const orderClauses = orderByText.split(',').map(c => c.trim());
    
    orderClauses.forEach(clause => {
      const parts = clause.split(/\s+/);
      const column = parts[0];
      const direction = (parts[1] || 'ASC').toUpperCase();
      
      query.orderBy.push({
        column,
        direction: direction as 'ASC' | 'DESC',
      });
    });
  }

  // Extract LIMIT
  const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
  if (limitMatch) {
    query.limit = parseInt(limitMatch[1]);
  }

  // Extract OFFSET
  const offsetMatch = sql.match(/OFFSET\s+(\d+)/i);
  if (offsetMatch) {
    query.offset = parseInt(offsetMatch[1]);
  }

  // Extract GROUP BY
  const groupByMatch = sql.match(/GROUP BY\s+([\s\S]*?)(?:ORDER BY|LIMIT|$)/i);
  if (groupByMatch) {
    const groupByText = groupByMatch[1].trim();
    query.groupBy = groupByText.split(',').map(c => c.trim());
  }

  // Extract HAVING
  const havingMatch = sql.match(/HAVING\s+([\s\S]*?)(?:ORDER BY|LIMIT|$)/i);
  if (havingMatch) {
    query.having = havingMatch[1].trim();
  }

  // Extract UNION/INTERSECT/EXCEPT
  if (sqlLower.includes('union all')) {
    query.unions = [{ type: 'UNION ALL', query: '' }];
  } else if (sqlLower.includes('union')) {
    query.unions = [{ type: 'UNION', query: '' }];
  } else if (sqlLower.includes('intersect')) {
    query.unions = [{ type: 'INTERSECT', query: '' }];
  } else if (sqlLower.includes('except')) {
    query.unions = [{ type: 'EXCEPT', query: '' }];
  }
  }
  
  // Handle INSERT queries
  else if (queryType === 'INSERT') {
    const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)\s*\(([\s\S]*?)\)\s*VALUES\s*\(([\s\S]*?)\)/i);
    if (insertMatch) {
      query.insertInto = {
        table: insertMatch[1],
        columns: insertMatch[2].split(',').map(c => c.trim()),
        values: [insertMatch[3].split(',').map(v => v.trim())],
      };
    }
  }
  
  // Handle UPDATE queries
  else if (queryType === 'UPDATE') {
    const updateMatch = sql.match(/UPDATE\s+(\w+)\s+SET\s+([\s\S]*?)(?:WHERE|$)/i);
    if (updateMatch) {
      const tableName = updateMatch[1];
      const setClause = updateMatch[2].trim();
      
      query.updateTable = {
        table: tableName,
        sets: setClause.split(',').map(s => {
          const [col, val] = s.split('=').map(p => p.trim());
          return { column: col, value: val };
        }),
      };
      
      // Extract WHERE for UPDATE
      const whereMatch = sql.match(/WHERE\s+([\s\S]*?)$/i);
      if (whereMatch) {
        parseWhereClause(whereMatch[1].trim(), query.filters);
      }
    }
  }
  
  // Handle DELETE queries
  else if (queryType === 'DELETE') {
    const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+([\s\S]*))?/i);
    if (deleteMatch) {
      query.deleteFrom = {
        table: deleteMatch[1],
      };
      
      if (deleteMatch[2]) {
        parseWhereClause(deleteMatch[2].trim(), query.filters);
      }
    }
  }
  
  // Handle CREATE TABLE queries
  else if (queryType === 'CREATE') {
    const createTableMatch = sql.match(/CREATE\s+TABLE\s+(\w+)\s*\(([\s\S]*?)\)/i);
    if (createTableMatch) {
      query.createTable = {
        name: createTableMatch[1],
        columns: [],
        constraints: [],
      };
      // Basic column parsing - can be enhanced
      const columnsText = createTableMatch[2];
      query.createTable.columnsRaw = columnsText;
    }
  }

  return query;
}

// Parse WHERE clause - Enhanced to support more operators
function parseWhereClause(whereClause: string, filterGroup: any): void {
  // Enhanced parsing with support for AND, OR, NOT
  const orGroups = whereClause.split(/\s+OR\s+/i);
  
  if (orGroups.length > 1) {
    // Has OR conditions - create nested groups
    filterGroup.logicalOperator = 'OR';
    orGroups.forEach(orGroup => {
      const andConditions = orGroup.split(/\s+AND\s+/i);
      if (andConditions.length > 1) {
        const andGroup = {
          id: `filter_group_${Date.now()}_${Math.random()}`,
          logicalOperator: 'AND',
          conditions: [],
          isGroup: true,
        };
        andConditions.forEach(cond => parseCondition(cond.trim(), andGroup));
        filterGroup.conditions.push(andGroup);
      } else {
        parseCondition(orGroup.trim(), filterGroup);
      }
    });
  } else {
    // Only AND conditions
    const conditions = whereClause.split(/\s+AND\s+/i);
    conditions.forEach(condition => parseCondition(condition.trim(), filterGroup));
  }
}

// Parse individual condition
function parseCondition(condition: string, filterGroup: any): void {
  // Enhanced pattern matching for all operators
  const match = condition.match(/(\w+\.?\w*)\s*(=|!=|<>|<|>|<=|>=|LIKE|NOT LIKE|IN|NOT IN|IS NULL|IS NOT NULL|EXISTS|NOT EXISTS|BETWEEN|NOT BETWEEN)\s*(.+)?/i);
  
  if (match) {
    const column = match[1];
    let operator = match[2].toUpperCase();
    let value = match[3]?.trim();
    
    // Normalize operators
    if (operator === '<>') operator = '!=';
    
    // Clean value quotes
    if (value) {
      value = value.replace(/^['"](.*)['"]$/, '$1');
      
      // Handle IN operator
      if (operator === 'IN' || operator === 'NOT IN') {
        value = value.replace(/^\((.+)\)$/, '$1');
      }
      
      // Handle BETWEEN
      if (operator === 'BETWEEN' || operator === 'NOT BETWEEN') {
        const betweenMatch = value.match(/(.+)\s+AND\s+(.+)/i);
        if (betweenMatch) {
          value = `${betweenMatch[1].trim()} AND ${betweenMatch[2].trim()}`;
        }
      }
    }

    filterGroup.conditions.push({
      id: `filter_${Date.now()}_${Math.random()}`,
      column,
      operator,
      value: value || '',
      isGroup: false,
    });
  }
}

// Validate SQL - Enhanced to support all query types
function validateSQL(sql: string): any {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const sqlLower = sql.toLowerCase().trim();
  
  // Detect query type
  const queryType = sqlLower.startsWith('select') ? 'SELECT' :
                   sqlLower.startsWith('insert') ? 'INSERT' :
                   sqlLower.startsWith('update') ? 'UPDATE' :
                   sqlLower.startsWith('delete') ? 'DELETE' :
                   sqlLower.startsWith('create') ? 'CREATE' :
                   sqlLower.startsWith('alter') ? 'ALTER' :
                   sqlLower.startsWith('drop') ? 'DROP' :
                   sqlLower.startsWith('truncate') ? 'TRUNCATE' :
                   'UNKNOWN';
  
  if (queryType === 'UNKNOWN') {
    errors.push('Unknown or unsupported SQL query type');
  }
  
  // SELECT-specific validations
  if (queryType === 'SELECT') {
    if (!sqlLower.includes('from')) {
      errors.push('Missing FROM clause');
    }
    
    if (sqlLower.includes('select *')) {
      warnings.push('Using SELECT * may impact performance. Consider selecting specific columns.');
    }
    
    if (!sqlLower.includes('limit') && !sqlLower.includes('top')) {
      warnings.push('Query does not have a LIMIT clause. This may return too many rows.');
    }
  }
  
  // UPDATE/DELETE-specific validations
  if (queryType === 'UPDATE' || queryType === 'DELETE') {
    if (!sqlLower.includes('where')) {
      warnings.push(`${queryType} without WHERE clause will affect all rows. Use with caution.`);
    }
  }
  
  // INSERT-specific validations
  if (queryType === 'INSERT') {
    if (!sqlLower.includes('values') && !sqlLower.includes('select')) {
      errors.push('INSERT must have VALUES clause or SELECT statement');
    }
  }
  
  // Check for potential SQL injection patterns
  if (sql.includes('--') || sql.includes('/*') || sql.includes('*/')) {
    warnings.push('SQL contains comments which may indicate security issues');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export default router;
