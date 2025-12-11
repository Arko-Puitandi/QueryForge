import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Schema, DatabaseType, TargetLanguage, GeneratedQuery, QueryAnalysis } from '../types';

interface AppState {
  // Theme
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;

  // Current Schema
  currentSchema: Schema | null;
  setCurrentSchema: (schema: Schema | null) => void;
  
  // Generated SQL (from schema generation)
  generatedSql: string | null;
  setGeneratedSql: (sql: string | null) => void;

  // Schema Input - persisted
  schemaDescription: string;
  setSchemaDescription: (desc: string) => void;

  // Database Type
  selectedDatabase: DatabaseType;
  setSelectedDatabase: (db: DatabaseType) => void;

  // Target Language
  selectedLanguage: TargetLanguage;
  setSelectedLanguage: (lang: TargetLanguage) => void;

  // Current Query (user input)
  currentQuery: string;
  setCurrentQuery: (query: string) => void;

  // Natural Language Query Input - persisted
  naturalLanguageInput: string;
  setNaturalLanguageInput: (input: string) => void;

  // Generated Query
  generatedQuery: GeneratedQuery | null;
  setGeneratedQuery: (query: GeneratedQuery | null) => void;

  // Query Analysis
  queryAnalysis: QueryAnalysis | null;
  setQueryAnalysis: (analysis: QueryAnalysis | null) => void;

  // Optimized Query
  optimizedQuery: {
    optimizedSql: string;
    optimizations: Array<{
      type: string;
      description: string;
      impact: string;
    }>;
    explanation: string;
  } | null;
  setOptimizedQuery: (optimized: {
    optimizedSql: string;
    optimizations: Array<{
      type: string;
      description: string;
      impact: string;
    }>;
    explanation: string;
  } | null) => void;

  // Query History
  queryHistory: Array<{
    id: string;
    query: string;
    naturalLanguage: string;
    timestamp: Date;
    databaseType: DatabaseType;
  }>;
  addToHistory: (entry: { query: string; naturalLanguage: string; databaseType: DatabaseType }) => void;
  clearHistory: () => void;

  // Loading States
  isGeneratingSchema: boolean;
  setIsGeneratingSchema: (loading: boolean) => void;
  isGeneratingQuery: boolean;
  setIsGeneratingQuery: (loading: boolean) => void;
  isAnalyzingQuery: boolean;
  setIsAnalyzingQuery: (loading: boolean) => void;
  isOptimizingQuery: boolean;
  setIsOptimizingQuery: (loading: boolean) => void;
  isExplainingQuery: boolean;
  setIsExplainingQuery: (loading: boolean) => void;
  isGeneratingCode: boolean;
  setIsGeneratingCode: (loading: boolean) => void;

  // UI State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activePage: string;
  setActivePage: (page: string) => void;

  // Reset functions
  resetSchema: () => void;
  resetQuery: () => void;
  resetAll: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Theme
      theme: 'dark',
      setTheme: (theme) => set({ theme }),

      // Current Schema
      currentSchema: null,
      setCurrentSchema: (schema) => set({ currentSchema: schema }),
      
      // Generated SQL
      generatedSql: null,
      setGeneratedSql: (sql) => set({ generatedSql: sql }),

      // Schema Input
      schemaDescription: '',
      setSchemaDescription: (desc) => set({ schemaDescription: desc }),

      // Database Type
      selectedDatabase: 'postgresql',
      setSelectedDatabase: (db) => set({ selectedDatabase: db }),

      // Target Language
      selectedLanguage: 'nodejs',
      setSelectedLanguage: (lang) => set({ selectedLanguage: lang }),

      // Current Query
      currentQuery: '',
      setCurrentQuery: (query) => set({ currentQuery: query }),

      // Natural Language Input
      naturalLanguageInput: '',
      setNaturalLanguageInput: (input) => set({ naturalLanguageInput: input }),

      // Generated Query
      generatedQuery: null,
      setGeneratedQuery: (query) => set({ generatedQuery: query }),

      // Query Analysis
      queryAnalysis: null,
      setQueryAnalysis: (analysis) => set({ queryAnalysis: analysis }),

      // Optimized Query
      optimizedQuery: null,
      setOptimizedQuery: (optimized) => set({ optimizedQuery: optimized }),

      // Query History
      queryHistory: [],
      addToHistory: (entry) =>
        set((state) => ({
          queryHistory: [
            {
              ...entry,
              id: Date.now().toString(),
              timestamp: new Date(),
            },
            ...state.queryHistory.slice(0, 49), // Keep last 50 queries
          ],
        })),
      clearHistory: () => set({ queryHistory: [] }),

      // Loading States
      isGeneratingSchema: false,
      setIsGeneratingSchema: (loading) => set({ isGeneratingSchema: loading }),
      isGeneratingQuery: false,
      setIsGeneratingQuery: (loading) => set({ isGeneratingQuery: loading }),
      isAnalyzingQuery: false,
      setIsAnalyzingQuery: (loading) => set({ isAnalyzingQuery: loading }),
      isOptimizingQuery: false,
      setIsOptimizingQuery: (loading) => set({ isOptimizingQuery: loading }),
      isExplainingQuery: false,
      setIsExplainingQuery: (loading) => set({ isExplainingQuery: loading }),
      isGeneratingCode: false,
      setIsGeneratingCode: (loading) => set({ isGeneratingCode: loading }),

      // UI State
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      activePage: 'schema',
      setActivePage: (page) => set({ activePage: page }),

      // Reset functions
      resetSchema: () => set({
        schemaDescription: '',
        currentSchema: null,
        generatedSql: null,
      }),
      resetQuery: () => set({
        naturalLanguageInput: '',
        currentQuery: '',
        generatedQuery: null,
        queryAnalysis: null,
        optimizedQuery: null,
      }),
      resetAll: () => set({
        schemaDescription: '',
        currentSchema: null,
        generatedSql: null,
        naturalLanguageInput: '',
        currentQuery: '',
        generatedQuery: null,
        queryAnalysis: null,
        optimizedQuery: null,
      }),
    }),
    {
      name: 'queryforge-storage',
      partialize: (state) => ({
        theme: state.theme,
        selectedDatabase: state.selectedDatabase,
        selectedLanguage: state.selectedLanguage,
        queryHistory: state.queryHistory,
        currentSchema: state.currentSchema,
        generatedSql: state.generatedSql,
        // Persist user inputs so they don't disappear on tab switch
        schemaDescription: state.schemaDescription,
        naturalLanguageInput: state.naturalLanguageInput,
        currentQuery: state.currentQuery,
        // Persist generated results
        generatedQuery: state.generatedQuery,
        queryAnalysis: state.queryAnalysis,
      }),
      // Migration to fix any corrupted data
      migrate: (persistedState: any) => {
        const state = persistedState as any;
        
        // Ensure selectedDatabase is a valid string
        if (typeof state.selectedDatabase !== 'string') {
          state.selectedDatabase = 'postgresql';
        }
        
        // Ensure selectedLanguage is a valid string
        if (typeof state.selectedLanguage !== 'string') {
          state.selectedLanguage = 'nodejs';
        }
        
        return state;
      },
    }
  )
);
