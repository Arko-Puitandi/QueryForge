# QueryForge User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Schema-First Architecture](#schema-first-architecture)
3. [Schema Builder](#schema-builder)
4. [Visual Designer](#visual-designer)
5. [Visual Query Builder](#visual-query-builder)
6. [Query Generator](#query-generator)
7. [Code Generator](#code-generator)
8. [History](#history)
9. [Settings](#settings)

---

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection
- Google Gemini API key (configured by administrator)

### First Steps
1. Navigate to the application URL (default: http://localhost:5173)
2. Select your preferred database type from the header dropdown
3. Select your target programming language
4. **Load or create a schema** - This is required for most features

---

## Schema-First Architecture

QueryForge follows a **schema-first architecture**. This means:

### What This Means
- A database schema must be loaded before using Query Generator, Visual Query Builder, or Code Generator
- Pages will show a prompt if no schema is loaded
- Changing schemas will reset related data (queries, generated code)

### Loading a Schema
You can load a schema in several ways:
1. **Generate from description** (Schema Builder page)
2. **Import from SQL/JSON** (Visual Designer page)
3. **Use a template** (Schema Builder page)
4. **Load from history** (History page)

### Schema Change Confirmation
When you change schemas, you'll see a confirmation dialog showing:
- Current schema name and table count
- New schema details
- What data will be reset (queries, generated code, etc.)

---

## Schema Builder

### Creating a Schema from Natural Language

1. Navigate to **Schema Builder** from the sidebar
2. Enter a natural language description of your database:
   ```
   E-commerce platform with users, products, categories, orders, and order items.
   Users can place orders. Products belong to categories.
   ```
3. Configure options:
   - ✅ Include Constraints (foreign keys, unique constraints)
   - ✅ Include Indexes (for performance)
4. Click **Generate Schema**

### Using Templates
1. Click **Templates** button
2. Browse pre-built schemas:
   - E-commerce
   - Social Media
   - Blog/CMS
   - SaaS Application
   - And more...
3. Click **Use Template** to load it

### Viewing Generated SQL
- Switch to **SQL** tab to see the generated DDL statements
- Copy or download the SQL for direct database execution

### Mock Data Generation
1. Switch to **Mock Data** tab
2. Configure:
   - Number of records per table
   - Data format (JSON/SQL/CSV)
3. Click **Generate Mock Data**
4. Download or copy the generated data

---

## Visual Designer

### Creating Schemas Visually

1. Navigate to **Visual Designer**
2. Click **New Schema** to start fresh
3. Enter schema name

### Adding Tables
1. Click **+ Add Table** button in the control panel
2. A new table appears on the canvas
3. Click the **Edit** button on the table header
4. Configure table properties:
   - Table name
   - Columns (name, type, constraints)
   - Primary keys
   - Foreign key references
   - Indexes
5. Click **Save**

### Creating Relationships
Foreign key relationships are automatically visualized when you:
1. Edit a table
2. Add a column with a foreign key reference
3. Select the target table and column

The relationship lines are:
- Color-coded for visibility
- Animated to show direction
- Labeled with the foreign key column name

### Managing Layout
- **Drag tables** to reposition them
- **Zoom** using mouse wheel or zoom controls
- **Layout dropdown** offers three options:
  - **Grid Layout**: Tables arranged in a grid
  - **Circular Layout**: Tables in a circle
  - **Hierarchical Layout**: Based on relationships (parent tables at top)
- **Fit View** button to see all tables
- **Toggle Relationships** to show/hide connection lines

### Deleting Tables
1. Click the **Trash** icon on a table header
2. Confirm in the modal dialog
3. Table and its relationships are removed

### Saving & Loading
- **Auto-save**: Automatically saves every 2 seconds
- **Manual save**: Click **Save** button
- **Load schema**: Select from saved schemas list
- **Export**: Download as JSON file
- **Import**: Upload JSON or SQL file

---

## Visual Query Builder

The Visual Query Builder lets you construct SQL queries by dragging and dropping, without writing SQL manually.

### Requirements
⚠️ **A schema must be loaded** to use the Visual Query Builder.

### Adding Tables
1. Navigate to **Visual Query** from the sidebar
2. Switch to **Tables** tab
3. Click tables from the available tables list
4. Tables appear on the canvas

### Selecting Columns
1. Click on a table in the canvas
2. Check the columns you want in your SELECT clause
3. Columns show checkmarks when selected

### Creating Joins
1. Switch to **Joins** tab
2. Click **Add Join**
3. Select source and target tables
4. Choose join type (INNER, LEFT, RIGHT, FULL, CROSS)
5. Configure join conditions

Join lines are displayed on the canvas with:
- Color-coded labels (blue for INNER, green for LEFT, etc.)
- Animated connections

### Adding Filters (WHERE)
1. Switch to **Filters** tab
2. Click **Add Filter**
3. Select table and column
4. Choose operator (=, !=, LIKE, IN, BETWEEN, etc.)
5. Enter value
6. Use AND/OR to combine conditions

### Advanced Options
1. Switch to **Advanced** tab
2. Configure:
   - **DISTINCT**: Remove duplicate rows
   - **LIMIT**: Restrict number of results
   - **OFFSET**: Skip rows
   - **GROUP BY**: Group results
   - **ORDER BY**: Sort results

### SQL Preview
1. Switch to **Preview** tab
2. See real-time generated SQL
3. View query statistics
4. Copy or download SQL

### Export Options
1. Switch to **Export** tab
2. Export as:
   - SQL file
   - PostgreSQL, MySQL, SQLite variants
   - Formatted or minified

### Resetting Query
- Click the **Reset** button
- Confirm in the modal dialog
- All tables, joins, and filters are cleared

---

## Query Generator

### Natural Language Queries

1. Navigate to **Query Generator**
2. **Ensure a schema is loaded** (required)
3. Enter your question in plain English:
   ```
   Get all users who placed orders in the last 30 days
   ```
4. Click **Generate Query**

### CRUD Operations

1. Switch to **CRUD** tab
2. Select operation type:
   - **Read** (SELECT)
   - **Create** (INSERT)
   - **Update** (UPDATE)
   - **Delete** (DELETE)
3. Select table
4. Configure options (columns, filters, sorting)
5. Click **Generate Query**

### Query Analysis
After generating a query:
- View **Performance Score**
- See **Complexity Analysis**
- Review **Optimization Suggestions**
- Read **Query Explanation**

### Query Optimization
1. Click **Optimize Query** button
2. Review AI-generated optimizations
3. Compare original vs optimized query
4. Apply suggested improvements

---

## Template Generator

### Generating Project Templates

1. Navigate to **Template Generator**
2. Select target language (Java, Python, Node.js, C#, Go)
3. Select framework
4. Choose components to include:
   - ✅ Repositories/DAOs
   - ✅ Services
   - ✅ Controllers/Endpoints
5. Add custom requirements (optional)
6. Click **Generate Project Template**

### Generated Files
Browse generated files by category:
- **Entities**: Data models
- **Repositories**: Database access layer
- **Services**: Business logic layer
- **Controllers**: API endpoints
- **DTOs**: Data transfer objects
- **Migrations**: Database migrations
- **Config**: Configuration files

### Docker Compose
1. Switch to **Docker Compose** tab
2. Select database type
3. Configure services
4. Click **Generate Docker Compose**
5. Download the `docker-compose.yml` file

### API Documentation
1. Switch to **API Docs** tab
2. Select format (OpenAPI 3.0 or Swagger 2.0)
3. Click **Generate API Documentation**
4. Download or copy the specification

### Downloading Code
- **Single file**: Click download icon on any file
- **All files**: Click **Save All Files**
- **As ZIP**: Click **Download as ZIP** for project structure

---

## History

### Viewing History
Navigate to **History** to view:
- **Schemas**: All generated schemas
- **Queries**: All generated queries  
- **Templates**: All generated code templates

### Using History Items

**Schemas:**
- Click **Load Schema** to use it again
- Click **View Details** to see the full schema
- Click **Delete** to remove from history

**Queries:**
- Click **Reuse Query** to load it in Query Generator
- View original natural language input
- See execution results

**Templates:**
- Click **View Template** to load all generated files
- Review generated code
- Download files again

### Search & Filter
- Use search bar to find specific items
- Filter by date, status, or type
- Sort by newest/oldest

### Clear History
- Click **Clear All** to delete all history
- Or delete individual items

---

## Settings

### Database Configuration
- Select default database type
- Configure connection strings (for live database features)

### Code Generation Preferences
- Default programming language
- Preferred frameworks
- Code style preferences

### UI Preferences
- Dark/Light theme toggle
- Auto-save settings
- Syntax highlighting
- Line numbers in code blocks

### API Keys
- Configure Gemini API key (if allowed)
- Manage authentication tokens

### History Management
- Set history retention period
- Configure max history items
- Enable/disable history tracking

---

## Keyboard Shortcuts

- `Cmd/Ctrl + K`: Open command palette
- `Cmd/Ctrl + S`: Save current work
- `Cmd/Ctrl + /`: Toggle comments (in code editor)
- `Esc`: Close modals/dialogs

---

## Tips & Best Practices

### Schema Design
- Start with clear, descriptive table names
- Use proper naming conventions (snake_case or camelCase)
- Always define primary keys
- Add indexes on frequently queried columns
- Use foreign keys for data integrity

### Query Generation
- Be specific in natural language descriptions
- Mention exact table and column names when possible
- Review and test generated queries before production use

### Code Generation
- Always review generated code before deployment
- Customize code to match your project standards
- Test generated APIs thoroughly
- Keep track of generated templates in history

### Performance
- Use the Visual Designer for complex schemas
- Enable auto-save to prevent data loss
- Clear old history periodically
- Use templates for common patterns

---

## Troubleshooting

### "No schema loaded" Error
- Generate or load a schema first from Schema Builder or Visual Designer

### "Rate limit exceeded" Error
- AI API has usage limits
- Wait a few minutes and try again
- Contact administrator if persistent

### Generated code doesn't compile
- Review the code for syntax errors
- Check if all dependencies are included
- Verify framework version compatibility

### Visual Designer performance issues
- Large schemas (50+ tables) may be slow
- Try hiding relationships temporarily
- Use zoom controls for better performance

---

## Support

For issues, feature requests, or questions:
- Check the FAQ section
- Review API Documentation
- Contact your system administrator
- Submit a bug report through the application
