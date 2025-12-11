import { apiGet, apiPost, apiDelete } from './api';
import { Schema, DatabaseType, GeneratedQuery, QueryAnalysis } from '../types';

export interface SessionState {
  activeSchemaId: number | null;
  activeSchema: Schema | null;
  generatedSql: string | null;
  databaseType: string;
  selectedLanguage: string;
  naturalLanguageInput: string;
  generatedQuery: GeneratedQuery | null;
  queryAnalysis: QueryAnalysis | null;
  hasActiveSchema: boolean;
  lastUpdated: string;
}

export interface SchemaStatus {
  hasActiveSchema: boolean;
  schemaId: number | null;
  schemaName: string | null;
  tableCount: number;
  databaseType: string;
}

// Get current session state from server
export async function getSessionState(): Promise<SessionState> {
  const response = await apiGet<SessionState>('/session/state');
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to get session state');
  }
  return response.data;
}

// Set active schema
export async function setActiveSchema(params: {
  schemaId?: number;
  schema: Schema;
  generatedSql?: string;
  databaseType?: DatabaseType;
}): Promise<void> {
  const response = await apiPost('/session/schema', params);
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to set active schema');
  }
}

// Load schema from history
export async function loadSchemaFromHistory(schemaId: number): Promise<{
  schema: Schema;
  generatedSql: string;
  databaseType: string;
  description: string;
}> {
  const response = await apiPost<{
    schema: Schema;
    generatedSql: string;
    databaseType: string;
    description: string;
  }>(`/session/schema/load/${schemaId}`, {});
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to load schema');
  }
  return response.data;
}

// Load schema from visual designer
export async function loadVisualSchema(schemaId: number): Promise<{
  schema: Schema;
  databaseType: string;
}> {
  const response = await apiPost<{
    schema: Schema;
    databaseType: string;
  }>(`/session/schema/load-visual/${schemaId}`, {});
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to load visual schema');
  }
  return response.data;
}

// Clear active schema
export async function clearActiveSchema(): Promise<void> {
  const response = await apiDelete('/session/schema');
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to clear schema');
  }
}

// Update query state
export async function updateQueryState(params: {
  naturalLanguageInput?: string;
  generatedQuery?: GeneratedQuery | null;
  queryAnalysis?: QueryAnalysis | null;
}): Promise<void> {
  const response = await apiPost('/session/query', params);
  if (!response.success) {
    // Check for NO_SCHEMA error
    if (response.error?.code === 'NO_SCHEMA') {
      throw new Error('NO_SCHEMA: ' + response.error.message);
    }
    throw new Error(response.error?.message || 'Failed to update query state');
  }
}

// Update settings
export async function updateSettings(params: {
  databaseType?: DatabaseType;
  selectedLanguage?: string;
}): Promise<void> {
  const response = await apiPost('/session/settings', params);
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to update settings');
  }
}

// Reset session
export async function resetSession(): Promise<void> {
  const response = await apiPost('/session/reset', {});
  if (!response.success) {
    throw new Error(response.error?.message || 'Failed to reset session');
  }
}

// Get schema status
export async function getSchemaStatus(): Promise<SchemaStatus> {
  const response = await apiGet<SchemaStatus>('/session/schema/status');
  if (!response.success || !response.data) {
    throw new Error(response.error?.message || 'Failed to get schema status');
  }
  return response.data;
}

export const sessionService = {
  getState: getSessionState,
  setActiveSchema,
  loadSchemaFromHistory,
  loadVisualSchema,
  clearActiveSchema,
  updateQueryState,
  updateSettings,
  resetSession,
  getSchemaStatus,
};
