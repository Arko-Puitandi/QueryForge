import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Schema, DatabaseType, TargetLanguage, GeneratedQuery, QueryAnalysis } from '../types';
import { sessionService } from '../services/session';

interface AppState {
  // Theme (only theme stays in localStorage)
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;

  // Schema state - server synced
  currentSchema: Schema | null;
  activeSchemaId: number | null;
  generatedSql: string | null;
  schemaDescription: string;
  
  // Database/Language settings
  selectedDatabase: DatabaseType;
  selectedLanguage: TargetLanguage;
  
  // Query state
  currentQuery: string;
  naturalLanguageInput: string;
  generatedQuery: GeneratedQuery | null;
  queryAnalysis: QueryAnalysis | null;
  optimizedQuery: {
    optimizedSql: string;
    optimizations: Array<{
      type: string;
      description: string;
      impact: string;
    }>;
    explanation: string;
  } | null;

  // Loading States
  isGeneratingSchema: boolean;
  isGeneratingQuery: boolean;
  isAnalyzingQuery: boolean;
  isOptimizingQuery: boolean;
  isExplainingQuery: boolean;
  isGeneratingCode: boolean;
  isLoadingSession: boolean;
  isSyncingWithServer: boolean;

  // UI State
  sidebarOpen: boolean;
  activePage: string;

  // Template data transfer (for code generation history)
  pendingTemplateData: {
    files: any[];
    language: string;
    framework: string;
    description: string;
  } | null;

  // Schema confirmation modal state
  pendingSchemaChange: {
    schema: Schema;
    schemaId?: number;
    generatedSql?: string;
    databaseType: DatabaseType;
    description?: string;
    source: 'history' | 'visual' | 'generated' | 'import';
  } | null;

  // Actions - Schema
  setCurrentSchema: (schema: Schema | null) => void;
  setActiveSchemaId: (id: number | null) => void;
  setGeneratedSql: (sql: string | null) => void;
  setSchemaDescription: (desc: string) => void;
  
  // Actions - Settings
  setSelectedDatabase: (db: DatabaseType) => void;
  setSelectedLanguage: (lang: TargetLanguage) => void;
  
  // Actions - Query
  setCurrentQuery: (query: string) => void;
  setNaturalLanguageInput: (input: string) => void;
  setGeneratedQuery: (query: GeneratedQuery | null) => void;
  setQueryAnalysis: (analysis: QueryAnalysis | null) => void;
  setOptimizedQuery: (optimized: AppState['optimizedQuery']) => void;

  // Actions - Loading
  setIsGeneratingSchema: (loading: boolean) => void;
  setIsGeneratingQuery: (loading: boolean) => void;
  setIsAnalyzingQuery: (loading: boolean) => void;
  setIsOptimizingQuery: (loading: boolean) => void;
  setIsExplainingQuery: (loading: boolean) => void;
  setIsGeneratingCode: (loading: boolean) => void;
  setIsLoadingSession: (loading: boolean) => void;
  setIsSyncingWithServer: (syncing: boolean) => void;

  // Actions - UI
  setSidebarOpen: (open: boolean) => void;
  setActivePage: (page: string) => void;

  // Actions - Template Data
  setPendingTemplateData: (data: AppState['pendingTemplateData']) => void;
  clearPendingTemplateData: () => void;

  // Actions - Schema Change Confirmation
  setPendingSchemaChange: (pending: AppState['pendingSchemaChange']) => void;
  confirmSchemaChange: () => Promise<void>;
  cancelSchemaChange: () => void;

  // Server Sync Actions
  loadSessionFromServer: () => Promise<void>;
  syncSchemaToServer: (schema: Schema, schemaId?: number, generatedSql?: string) => Promise<void>;
  syncQueryToServer: () => Promise<void>;
  syncSettingsToServer: () => Promise<void>;
  
  // Load schema actions (with confirmation flow)
  loadSchemaFromHistory: (schemaId: number) => Promise<void>;
  loadSchemaFromVisual: (schemaId: number) => Promise<void>;

  // Reset functions
  resetSchema: () => void;
  resetQuery: () => void;
  resetAll: () => void;

  // Helper
  hasActiveSchema: () => boolean;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Theme
      theme: 'dark',
      setTheme: (theme) => set({ theme }),

      // Schema State
      currentSchema: null,
      activeSchemaId: null,
      generatedSql: null,
      schemaDescription: '',
      
      setCurrentSchema: (schema) => set({ currentSchema: schema }),
      setActiveSchemaId: (id) => set({ activeSchemaId: id }),
      setGeneratedSql: (sql) => set({ generatedSql: sql }),
      setSchemaDescription: (desc) => set({ schemaDescription: desc }),

      // Database/Language
      selectedDatabase: 'postgresql',
      selectedLanguage: 'nodejs',
      
      setSelectedDatabase: (db) => {
        set({ selectedDatabase: db });
        get().syncSettingsToServer();
      },
      setSelectedLanguage: (lang) => {
        set({ selectedLanguage: lang });
        get().syncSettingsToServer();
      },

      // Query State
      currentQuery: '',
      naturalLanguageInput: '',
      generatedQuery: null,
      queryAnalysis: null,
      optimizedQuery: null,

      setCurrentQuery: (query) => set({ currentQuery: query }),
      setNaturalLanguageInput: (input) => set({ naturalLanguageInput: input }),
      setGeneratedQuery: (query) => set({ generatedQuery: query }),
      setQueryAnalysis: (analysis) => set({ queryAnalysis: analysis }),
      setOptimizedQuery: (optimized) => set({ optimizedQuery: optimized }),

      // Loading States
      isGeneratingSchema: false,
      isGeneratingQuery: false,
      isAnalyzingQuery: false,
      isOptimizingQuery: false,
      isExplainingQuery: false,
      isGeneratingCode: false,
      isLoadingSession: false,
      isSyncingWithServer: false,

      setIsGeneratingSchema: (loading) => set({ isGeneratingSchema: loading }),
      setIsGeneratingQuery: (loading) => set({ isGeneratingQuery: loading }),
      setIsAnalyzingQuery: (loading) => set({ isAnalyzingQuery: loading }),
      setIsOptimizingQuery: (loading) => set({ isOptimizingQuery: loading }),
      setIsExplainingQuery: (loading) => set({ isExplainingQuery: loading }),
      setIsGeneratingCode: (loading) => set({ isGeneratingCode: loading }),
      setIsLoadingSession: (loading) => set({ isLoadingSession: loading }),
      setIsSyncingWithServer: (syncing) => set({ isSyncingWithServer: syncing }),

      // UI State
      sidebarOpen: true,
      activePage: 'schema',
      
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setActivePage: (page) => set({ activePage: page }),

      // Template Data Transfer
      pendingTemplateData: null,
      setPendingTemplateData: (data) => set({ pendingTemplateData: data }),
      clearPendingTemplateData: () => set({ pendingTemplateData: null }),

      // Schema Change Confirmation
      pendingSchemaChange: null,
      setPendingSchemaChange: (pending) => set({ pendingSchemaChange: pending }),
      
      confirmSchemaChange: async () => {
        const { pendingSchemaChange } = get();
        if (!pendingSchemaChange) return;
        
        try {
          set({ isSyncingWithServer: true });
          
          await sessionService.setActiveSchema({
            schemaId: pendingSchemaChange.schemaId,
            schema: pendingSchemaChange.schema,
            generatedSql: pendingSchemaChange.generatedSql,
            databaseType: pendingSchemaChange.databaseType,
          });
          
          set({
            currentSchema: pendingSchemaChange.schema,
            activeSchemaId: pendingSchemaChange.schemaId || null,
            generatedSql: pendingSchemaChange.generatedSql || null,
            selectedDatabase: pendingSchemaChange.databaseType,
            schemaDescription: pendingSchemaChange.description || '',
            naturalLanguageInput: '',
            currentQuery: '',
            generatedQuery: null,
            queryAnalysis: null,
            optimizedQuery: null,
            pendingSchemaChange: null,
          });
        } catch (error) {
          console.error('Failed to confirm schema change:', error);
          throw error;
        } finally {
          set({ isSyncingWithServer: false });
        }
      },
      
      cancelSchemaChange: () => set({ pendingSchemaChange: null }),

      // Server Sync Actions
      loadSessionFromServer: async () => {
        try {
          set({ isLoadingSession: true });
          const state = await sessionService.getState();
          
          set({
            currentSchema: state.activeSchema,
            activeSchemaId: state.activeSchemaId,
            generatedSql: state.generatedSql,
            selectedDatabase: (state.databaseType as DatabaseType) || 'postgresql',
            selectedLanguage: (state.selectedLanguage as TargetLanguage) || 'nodejs',
            naturalLanguageInput: state.naturalLanguageInput || '',
            generatedQuery: state.generatedQuery,
            queryAnalysis: state.queryAnalysis,
          });
        } catch (error) {
          console.error('Failed to load session from server:', error);
        } finally {
          set({ isLoadingSession: false });
        }
      },

      syncSchemaToServer: async (schema, schemaId, generatedSql) => {
        try {
          set({ isSyncingWithServer: true });
          await sessionService.setActiveSchema({
            schemaId,
            schema,
            generatedSql,
            databaseType: get().selectedDatabase,
          });
          set({
            currentSchema: schema,
            activeSchemaId: schemaId || null,
            generatedSql: generatedSql || null,
          });
        } catch (error) {
          console.error('Failed to sync schema to server:', error);
          throw error;
        } finally {
          set({ isSyncingWithServer: false });
        }
      },

      syncQueryToServer: async () => {
        try {
          const { naturalLanguageInput, generatedQuery, queryAnalysis } = get();
          await sessionService.updateQueryState({
            naturalLanguageInput,
            generatedQuery,
            queryAnalysis,
          });
        } catch (error: any) {
          if (error.message?.includes('NO_SCHEMA')) {
            throw new Error('Please load a schema first before creating queries.');
          }
          throw error;
        }
      },

      syncSettingsToServer: async () => {
        try {
          const { selectedDatabase, selectedLanguage } = get();
          await sessionService.updateSettings({
            databaseType: selectedDatabase,
            selectedLanguage,
          });
        } catch (error) {
          console.error('Failed to sync settings to server:', error);
        }
      },

      loadSchemaFromHistory: async (schemaId: number) => {
        const { currentSchema } = get();
        
        try {
          const data = await sessionService.loadSchemaFromHistory(schemaId);
          
          if (currentSchema && currentSchema.tables && currentSchema.tables.length > 0) {
            set({
              pendingSchemaChange: {
                schema: data.schema,
                schemaId,
                generatedSql: data.generatedSql,
                databaseType: data.databaseType as DatabaseType,
                description: data.description,
                source: 'history',
              },
            });
          } else {
            await sessionService.setActiveSchema({
              schemaId,
              schema: data.schema,
              generatedSql: data.generatedSql,
              databaseType: data.databaseType as DatabaseType,
            });
            
            set({
              currentSchema: data.schema,
              activeSchemaId: schemaId,
              generatedSql: data.generatedSql,
              selectedDatabase: data.databaseType as DatabaseType,
              schemaDescription: data.description,
              naturalLanguageInput: '',
              currentQuery: '',
              generatedQuery: null,
              queryAnalysis: null,
              optimizedQuery: null,
            });
          }
        } catch (error) {
          console.error('Failed to load schema from history:', error);
          throw error;
        }
      },

      loadSchemaFromVisual: async (schemaId: number) => {
        const { currentSchema } = get();
        
        try {
          const data = await sessionService.loadVisualSchema(schemaId);
          
          if (currentSchema && currentSchema.tables && currentSchema.tables.length > 0) {
            set({
              pendingSchemaChange: {
                schema: data.schema,
                schemaId,
                databaseType: data.databaseType as DatabaseType,
                source: 'visual',
              },
            });
          } else {
            await sessionService.setActiveSchema({
              schemaId,
              schema: data.schema,
              databaseType: data.databaseType as DatabaseType,
            });
            
            set({
              currentSchema: data.schema,
              activeSchemaId: schemaId,
              generatedSql: null,
              selectedDatabase: data.databaseType as DatabaseType,
              naturalLanguageInput: '',
              currentQuery: '',
              generatedQuery: null,
              queryAnalysis: null,
              optimizedQuery: null,
            });
          }
        } catch (error) {
          console.error('Failed to load visual schema:', error);
          throw error;
        }
      },

      // Reset functions
      resetSchema: () => {
        sessionService.clearActiveSchema().catch(console.error);
        set({
          schemaDescription: '',
          currentSchema: null,
          activeSchemaId: null,
          generatedSql: null,
          naturalLanguageInput: '',
          currentQuery: '',
          generatedQuery: null,
          queryAnalysis: null,
          optimizedQuery: null,
        });
      },
      
      resetQuery: () => set({
        naturalLanguageInput: '',
        currentQuery: '',
        generatedQuery: null,
        queryAnalysis: null,
        optimizedQuery: null,
      }),
      
      resetAll: () => {
        sessionService.resetSession().catch(console.error);
        set({
          schemaDescription: '',
          currentSchema: null,
          activeSchemaId: null,
          generatedSql: null,
          naturalLanguageInput: '',
          currentQuery: '',
          generatedQuery: null,
          queryAnalysis: null,
          optimizedQuery: null,
        });
      },

      hasActiveSchema: () => {
        const { currentSchema } = get();
        return currentSchema !== null && 
               currentSchema.tables !== undefined && 
               currentSchema.tables.length > 0;
      },
    }),
    {
      name: 'queryforge-storage',
      // Only persist theme and UI preferences
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
