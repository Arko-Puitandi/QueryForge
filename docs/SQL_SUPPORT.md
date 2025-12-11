# Visual Query Designer - SQL Support Documentation

## 🎯 Overview
The Visual Query Designer now supports comprehensive SQL operations including all major keywords and query types. You can either build queries visually or import existing SQL for visualization.

## ✅ Supported SQL Keywords & Features

### 📊 Query Types (DML - Data Manipulation Language)
- **SELECT** - Query data from tables
- **INSERT** - Add new records
- **UPDATE** - Modify existing records
- **DELETE** - Remove records

### 🏗️ DDL Support (Data Definition Language)
- **CREATE** - Create tables, databases, indexes, views
- **ALTER** - Modify table structure
- **DROP** - Delete tables, databases, indexes, views
- **TRUNCATE** - Remove all records from table

### 🔗 All Join Types (14 Variants)
1. **INNER JOIN** - Returns rows with matching values in both tables
2. **LEFT JOIN** - All rows from left table, matching rows from right
3. **LEFT OUTER JOIN** - Same as LEFT JOIN
4. **RIGHT JOIN** - All rows from right table, matching rows from left
5. **RIGHT OUTER JOIN** - Same as RIGHT JOIN
6. **FULL JOIN** - All rows when there's a match in either table
7. **FULL OUTER JOIN** - Same as FULL JOIN
8. **CROSS JOIN** - Cartesian product (every row combined)
9. **SELF JOIN** - Join table to itself
10. **NATURAL JOIN** - Join on columns with same names
11. **LEFT ANTI JOIN** - Rows in left table with no match in right
12. **RIGHT ANTI JOIN** - Rows in right table with no match in left
13. **LEFT SEMI JOIN** - Rows in left table with match in right (no duplicates)
14. **RIGHT SEMI JOIN** - Rows in right table with match in left (no duplicates)

### 🔍 Filter Operators (16 Total)
- **=** - Equals
- **!=** / **<>** - Not equals
- **<** - Less than
- **>** - Greater than
- **<=** - Less than or equal
- **>=** - Greater than or equal
- **LIKE** - Pattern matching
- **NOT LIKE** - Inverse pattern matching
- **IN** - Match any value in list
- **NOT IN** - Not in list
- **IS NULL** - Check for NULL
- **IS NOT NULL** - Check for non-NULL
- **BETWEEN** - Range check
- **NOT BETWEEN** - Inverse range
- **EXISTS** - Subquery exists check
- **NOT EXISTS** - Subquery not exists check

### 🧮 Advanced Query Features

#### Logical Operators
- **AND** - All conditions must be true
- **OR** - Any condition can be true
- **NOT** - Negate condition

#### Set Operations
- **UNION** - Combine results (remove duplicates)
- **UNION ALL** - Combine results (keep duplicates)
- **INTERSECT** - Common rows between queries
- **EXCEPT** / **MINUS** - Rows in first query but not second

#### Aggregation
- **GROUP BY** - Group rows by column values
- **HAVING** - Filter groups
- **COUNT()** - Count rows
- **SUM()** - Sum values
- **AVG()** - Average values
- **MIN()** - Minimum value
- **MAX()** - Maximum value

#### Window Functions
- **ROW_NUMBER()** - Sequential row number
- **RANK()** - Ranking with gaps
- **DENSE_RANK()** - Ranking without gaps
- **LAG()** - Previous row value
- **LEAD()** - Next row value
- **FIRST_VALUE()** - First value in window
- **LAST_VALUE()** - Last value in window
- **NTILE()** - Divide into buckets

#### Query Modifiers
- **DISTINCT** - Remove duplicate rows
- **ORDER BY** - Sort results (ASC/DESC)
- **LIMIT** - Restrict number of rows
- **OFFSET** - Skip rows
- **TOP** - SQL Server style limit
- **FETCH FIRST** - Standard SQL limit

#### Subqueries & CTEs
- **Subqueries** - Nested SELECT statements
- **WITH (CTE)** - Common Table Expressions
- **ALL** - Compare with all values
- **ANY** / **SOME** - Compare with any value

#### Row Locking
- **FOR UPDATE** - Lock rows for update
- **FOR SHARE** - Shared lock on rows

### 🎨 Database-Specific Features

#### PostgreSQL
- Array operators
- JSON/JSONB support
- Full-text search
- Window functions
- RETURNING clause

#### MySQL
- AUTO_INCREMENT
- ON DUPLICATE KEY UPDATE
- LIMIT with OFFSET

#### SQL Server
- TOP clause
- IDENTITY columns
- OUTPUT clause

#### SQLite
- AUTOINCREMENT
- LIMITED window function support

## 🚀 Usage Examples

### Visual Query Building
1. Click **Tables** tab - Add tables and select columns
2. Click **Joins** tab - Configure table relationships
3. Click **Filters** tab - Add WHERE conditions
4. Click **Advanced** tab - Set GROUP BY, ORDER BY, LIMIT
5. Click **Preview** tab - See generated SQL

### SQL to Visual (New!)
1. Paste any SQL query in the **SQL Visualizer** input at the top
2. Click **Visualize SQL Query**
3. Your query is automatically converted to visual representation
4. Edit visually or continue with SQL

### AI Assistant
1. Click **AI** tab
2. Type natural language: "Get all active users ordered by name"
3. AI generates optimized SQL
4. Auto-analysis shows performance suggestions

### SQL Import
1. Click **Import** tab
2. Paste SQL or upload .sql file
3. Validation runs automatically
4. Import converts to visual query

### SQL Export
1. Click **Export** tab
2. Choose target database (PostgreSQL, MySQL, SQL Server, SQLite, etc.)
3. Copy or download optimized SQL for your database

## 🎯 Supported SQL Commands

### Complete Keyword List
```
ADD, ALTER, AND, ANY, AS, ASC, AUTO_INCREMENT,
BETWEEN, BY,
CASE, CAST, CHECK, COLUMN, COMMIT, CONSTRAINT, COUNT, CREATE, CROSS,
DATABASE, DEFAULT, DELETE, DESC, DISTINCT, DROP,
ELSE, END, EXCEPT, EXISTS,
FETCH, FIRST, FOR, FOREIGN, FROM, FULL,
GRANT, GROUP,
HAVING,
IDENTITY, IN, INDEX, INNER, INSERT, INTERSECT, INTO, IS,
JOIN,
KEY,
LAST, LEFT, LIKE, LIMIT,
MAX, MIN, MINUS,
NATURAL, NOT, NULL,
OFFSET, ON, OR, ORDER, OUTER, OUTPUT,
PRIMARY,
RANK, REFERENCES, RETURNING, REVOKE, RIGHT, ROLLBACK, ROW_NUMBER,
SAVEPOINT, SELECT, SEMI, SET, SHARE, SOME, SUM,
TABLE, THEN, TOP, TRUNCATE,
UNION, UNIQUE, UPDATE,
VALUES, VIEW,
WHEN, WHERE, WINDOW, WITH
```

## 📝 Query Type Examples

### SELECT Query
```sql
SELECT DISTINCT u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.status = 'active'
  AND u.created_at > '2024-01-01'
GROUP BY u.name
HAVING COUNT(o.id) > 5
ORDER BY order_count DESC
LIMIT 10 OFFSET 0;
```

### INSERT Query
```sql
INSERT INTO users (name, email, status)
VALUES ('John Doe', 'john@example.com', 'active');
```

### UPDATE Query
```sql
UPDATE users
SET status = 'inactive', updated_at = NOW()
WHERE last_login < '2023-01-01';
```

### DELETE Query
```sql
DELETE FROM logs
WHERE created_at < '2023-01-01'
  AND level = 'debug';
```

### CREATE TABLE Query
```sql
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Complex Query with CTE
```sql
WITH monthly_sales AS (
  SELECT 
    DATE_TRUNC('month', order_date) as month,
    SUM(total) as revenue
  FROM orders
  GROUP BY month
)
SELECT 
  month,
  revenue,
  LAG(revenue) OVER (ORDER BY month) as prev_month,
  revenue - LAG(revenue) OVER (ORDER BY month) as growth
FROM monthly_sales
ORDER BY month DESC;
```

### UNION Query
```sql
SELECT id, name FROM customers WHERE country = 'USA'
UNION ALL
SELECT id, name FROM prospects WHERE status = 'active';
```

## 🎓 Best Practices

1. **Use Specific Columns** - Avoid SELECT * in production
2. **Add LIMIT** - Always limit results for large tables
3. **Index Join Columns** - Ensure join columns are indexed
4. **Use Prepared Statements** - Prevent SQL injection
5. **Avoid N+1 Queries** - Use JOINs instead of multiple queries
6. **Use Window Functions** - Instead of self-joins when possible
7. **Test with EXPLAIN** - Analyze query execution plans
8. **Use CTEs** - For complex queries instead of nested subqueries

## 🔧 Parser Capabilities

The SQL parser can:
- ✅ Parse all 14 join types
- ✅ Handle complex WHERE clauses (AND, OR, NOT)
- ✅ Extract all operators (=, !=, <, >, LIKE, IN, EXISTS, BETWEEN, etc.)
- ✅ Parse GROUP BY, HAVING, ORDER BY
- ✅ Extract LIMIT and OFFSET
- ✅ Detect UNION, INTERSECT, EXCEPT
- ✅ Identify query type (SELECT, INSERT, UPDATE, DELETE, CREATE, etc.)
- ✅ Extract table aliases
- ✅ Parse column selections with aliases
- ✅ Handle subqueries (basic support)
- ✅ Validate SQL syntax
- ✅ Provide optimization warnings

## 🚨 Current Limitations

- Window functions are recognized but not fully visualized
- CTEs are detected but not fully parsed in visual builder
- Complex nested subqueries may need manual review
- DDL statements are parsed but not fully visualized
- Some database-specific syntax may need adaptation

## 🔮 Future Enhancements

- Full CTE visual builder
- Window function visual designer
- DDL visual schema editor
- Advanced subquery builder
- Query optimization engine
- Execution plan visualizer
- Database migration tools

---

**Last Updated:** January 2025  
**Version:** 2.0 - Full SQL Support Release
