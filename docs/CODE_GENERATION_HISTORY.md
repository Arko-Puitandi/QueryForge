# Code Generation History Feature

## Overview
Added a complete history tracking system for code generation projects. Users can now view all previously generated code projects, including their descriptions, languages, frameworks, and generated files.

## Changes Made

### 1. Database Schema (`server/src/services/database/historyDatabase.ts`)

#### New Table: `code_generation_history`
```sql
CREATE TABLE IF NOT EXISTS code_generation_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  description TEXT NOT NULL,
  language TEXT NOT NULL,
  framework TEXT NOT NULL,
  options_json TEXT,
  schema_json TEXT,
  files_json TEXT NOT NULL,
  file_count INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  processing_time INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

#### New Interface: `CodeGenerationHistoryEntry`
```typescript
export interface CodeGenerationHistoryEntry {
  id?: number;
  description: string;
  language: string;
  framework: string;
  optionsJson?: string;
  schemaJson?: string;
  filesJson: string;
  fileCount: number;
  status: 'success' | 'error';
  errorMessage?: string;
  processingTime: number;
  createdAt?: string;
}
```

#### New Methods
- `saveCodeGenerationHistory(entry)` - Save a code generation to history
- `getCodeGenerationHistory(limit, offset)` - Get paginated code generation history
- `getCodeGenerationById(id)` - Get a single code generation entry by ID
- `deleteCodeGenerationHistory(id)` - Delete a code generation entry
- `clearCodeGenerationHistory()` - Clear all code generation history

#### Updated Methods
- `getStats()` - Now includes `codeGenerationCount`
- `searchHistory()` - Now supports `type: 'code'` parameter
- `clearAllHistory()` - Now includes `codeGenerationsDeleted` count

### 2. Backend Routes (`server/src/routes/history.ts`)

Added new routes for code generation history:
- `GET /api/history/code` - Get all code generation history (with pagination)
- `GET /api/history/code/:id` - Get a single code generation entry
- `DELETE /api/history/code/:id` - Delete a code generation entry
- `DELETE /api/history/code` - Clear all code generation history

Updated search route:
- `GET /api/history/search?q=<query>&type=<schema|query|code|all>` - Now supports 'code' type

### 3. Code Controller (`server/src/controllers/codeController.ts`)

Updated `generate()` method to automatically save successful code generations to history:

```typescript
// Save to history
try {
  const description = `Generated ${request.language} ${request.framework} project with ${result.files.length} files`;
  historyDb.saveCodeGenerationHistory({
    description,
    language: request.language,
    framework: request.framework,
    optionsJson: JSON.stringify(request.options || {}),
    schemaJson: JSON.stringify(request.schema),
    filesJson: JSON.stringify(result.files),
    fileCount: result.files.length,
    status: 'success',
    processingTime,
  });
} catch (historyError) {
  console.error('[CodeController] Failed to save history:', historyError);
  // Don't fail the request if history save fails
}
```

### 4. Frontend Services (`client/src/services/index.ts`)

#### New Interface
```typescript
export interface CodeGenerationHistoryEntry {
  id: number;
  description: string;
  language: string;
  framework: string;
  optionsJson?: string;
  schemaJson?: string;
  filesJson: string;
  fileCount: number;
  status: 'success' | 'error';
  errorMessage?: string;
  processingTime: number;
  createdAt: string;
}
```

#### New Methods in `historyService`
- `getCodeGenerationHistory(limit, offset)` - Fetch code generation history
- `getCodeGenerationById(id)` - Fetch single entry
- `deleteCodeGeneration(id)` - Delete an entry
- `clearCodeGenerationHistory()` - Clear all code generation history

Updated `HistoryStats` interface to include `codeGenerationCount`.

### 5. History Page UI (`client/src/pages/HistoryPage.tsx`)

#### New Features
- Added "Code" tab to view code generation history
- Display code generation entries with:
  - Language and framework badges
  - File count
  - Status indicator (success/error)
  - Processing time
  - Creation date
  - Description
  - List of generated files (up to 20 shown)
- "View Code" button to navigate to code page (placeholder)
- Delete button for each entry
- Search functionality for code generations

#### UI Components
```tsx
<Card>
  <div className="space-y-4">
    {/* Header with status, language, framework, file count */}
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="badge success/error">{status}</span>
          <span className="badge purple">{language}</span>
          <span className="badge blue">{framework}</span>
          <span className="text-gray">{fileCount} files</span>
        </div>
        <p className="timestamp">{createdAt} • {processingTime}s</p>
      </div>
      <div className="actions">
        <Button onClick={viewCode}>View Code</Button>
        <Button onClick={delete}>Delete</Button>
      </div>
    </div>

    {/* Description */}
    <div className="description">{description}</div>

    {/* Files Preview (first 20 files) */}
    <div className="files-grid">
      {files.map(file => (
        <div className="file-item">{file.path}</div>
      ))}
    </div>

    {/* Error Message (if failed) */}
    {errorMessage && <div className="error">{errorMessage}</div>}
  </div>
</Card>
```

## Usage

### Backend
Code generations are automatically saved to history when generated successfully:

```typescript
const result = await codeGenerator.generateCode(request);
// Automatically saved to history with:
// - description: "Generated java spring-boot project with 16 files"
// - language: "java"
// - framework: "spring-boot"
// - filesJson: JSON array of all generated files
// - fileCount: 16
// - status: "success"
// - processingTime: 1234ms
```

### Frontend API Calls

#### Get Code Generation History
```typescript
const history = await historyService.getCodeGenerationHistory(50, 0);
// Returns array of CodeGenerationHistoryEntry[]
```

#### Get Single Entry
```typescript
const entry = await historyService.getCodeGenerationById(1);
// Returns CodeGenerationHistoryEntry with all files
```

#### Delete Entry
```typescript
await historyService.deleteCodeGeneration(1);
```

#### Search Code Generations
```typescript
const results = await historyService.search('spring-boot', 'code');
// Returns matching code generations
```

### Database Queries

#### Get Recent Code Generations
```sql
SELECT * FROM code_generation_history 
ORDER BY created_at DESC 
LIMIT 50;
```

#### Get Stats
```sql
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
  AVG(processing_time) as avg_time,
  AVG(file_count) as avg_files
FROM code_generation_history;
```

#### Search by Language
```sql
SELECT * FROM code_generation_history 
WHERE language LIKE '%java%' 
ORDER BY created_at DESC;
```

## Testing

### Manual Testing Steps

1. **Generate Code**
   - Navigate to Code Generator page
   - Enter a schema (or use test schema)
   - Click "Generate Code"
   - Verify files are generated

2. **Check History**
   - Navigate to History page
   - Click "Code" tab
   - Verify the generated project appears in the list
   - Check that all information is displayed correctly:
     - Description
     - Language badge
     - Framework badge
     - File count
     - Status (success)
     - Processing time
     - Generated files list

3. **View Details**
   - Click on a history entry
   - Verify file list is shown (up to 20 files)
   - If more than 20 files, verify "... and N more files" message

4. **Delete Entry**
   - Click Delete button on an entry
   - Confirm deletion in modal
   - Verify entry is removed from list

5. **Search**
   - Type a search query (e.g., "spring-boot")
   - Verify relevant entries are filtered
   - Clear search to see all entries again

### API Testing with cURL

#### Generate Code (triggers history save)
```bash
curl -X POST http://localhost:3001/api/code/generate \
  -H "Content-Type: application/json" \
  -d '{
    "schema": {
      "tables": [{
        "name": "users",
        "columns": [
          {"name": "id", "type": "BIGINT", "isPrimaryKey": true},
          {"name": "username", "type": "VARCHAR(100)"}
        ]
      }]
    },
    "language": "java",
    "framework": "spring-boot",
    "options": {}
  }'
```

#### Get Code Generation History
```bash
curl http://localhost:3001/api/history/code
```

#### Get Single Entry
```bash
curl http://localhost:3001/api/history/code/1
```

#### Delete Entry
```bash
curl -X DELETE http://localhost:3001/api/history/code/1
```

#### Search
```bash
curl "http://localhost:3001/api/history/search?q=spring-boot&type=code"
```

#### Get Stats
```bash
curl http://localhost:3001/api/history/stats
```

## Data Examples

### Sample Code Generation History Entry
```json
{
  "id": 1,
  "description": "Generated java spring-boot project with 16 files",
  "language": "java",
  "framework": "spring-boot",
  "optionsJson": "{\"includeRepository\":true,\"includeService\":true}",
  "schemaJson": "{\"tables\":[{\"name\":\"users\",\"columns\":[...]}]}",
  "filesJson": "[{\"path\":\"src/main/java/com/example/entity/User.java\",\"content\":\"...\"},...]",
  "fileCount": 16,
  "status": "success",
  "errorMessage": null,
  "processingTime": 1234,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

### Sample Files in History
Each history entry contains complete file information:
```json
[
  {
    "path": "src/main/java/com/example/entity/User.java",
    "content": "package com.example.entity;\n\nimport jakarta.persistence.*;\n...",
    "language": "java"
  },
  {
    "path": "src/main/java/com/example/repository/UserRepository.java",
    "content": "package com.example.repository;\n\nimport org.springframework.data.jpa.repository.*;\n...",
    "language": "java"
  },
  // ... all 16 files
]
```

## Benefits

1. **Project Tracking** - Keep a complete record of all generated code projects
2. **Reusability** - Quickly access and reuse previously generated code
3. **Auditability** - Track what was generated, when, and with what parameters
4. **Performance Monitoring** - See processing times for each generation
5. **Error Analysis** - Review failed generations with error messages
6. **Search & Filter** - Find specific projects by language, framework, or description

## Future Enhancements

1. **Load from History** - Implement "View Code" button to load files back into the code generator
2. **Export/Import** - Allow exporting/importing history entries
3. **Tags/Labels** - Add custom tags to organize projects
4. **Notes** - Add user notes to history entries
5. **Favorites** - Mark frequently used projects as favorites
6. **Comparison** - Compare different versions of generated code
7. **Templates** - Save code generations as reusable templates
8. **Sharing** - Share history entries with team members

## Database Statistics

### Current Schema
- **Tables**: 4 (schema_history, query_history, code_generation_history, indexes)
- **Indexes**: 3 (one per history table, on created_at DESC)
- **Foreign Keys**: None (all tables are independent)

### Storage Estimates
- Average code generation entry: ~50-200KB (depending on file count and content)
- 1000 entries: ~50-200MB
- Recommended: Regular cleanup of old entries or archiving

## Maintenance

### Database Cleanup
```sql
-- Delete entries older than 90 days
DELETE FROM code_generation_history 
WHERE created_at < datetime('now', '-90 days');

-- Keep only last 100 entries
DELETE FROM code_generation_history 
WHERE id NOT IN (
  SELECT id FROM code_generation_history 
  ORDER BY created_at DESC 
  LIMIT 100
);
```

### Performance Optimization
- Index on `created_at DESC` for fast recent queries
- Consider archiving old entries to separate table
- Regularly vacuum the database: `VACUUM;`

## Security Considerations

1. **File Content** - All generated code is stored in database, ensure proper backup
2. **Sensitive Data** - Avoid generating code with real credentials/secrets
3. **Access Control** - Currently no user-level access control (all history shared)
4. **Input Validation** - Schema and options are stored as JSON strings, validated on generation

## Conclusion

The code generation history feature provides a comprehensive tracking system for all generated code projects. Users can now easily view, search, and manage their previously generated code, making the development workflow more efficient and organized.
