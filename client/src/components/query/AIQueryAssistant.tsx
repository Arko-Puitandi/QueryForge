import React, { useState, useEffect } from 'react';
import { Button, Textarea } from '../common';
import { Sparkles, Send, Wand2, CheckCircle, AlertCircle, Lightbulb, TrendingUp, Zap, Loader2 } from 'lucide-react';
import { VisualQuery } from '../../types';
import { generateQueryFromNaturalLanguage, analyzeQuery, optimizeQuery } from '../../services/api';
import { useAppStore } from '../../stores/appStore';

interface AIQueryAssistantProps {
  currentQuery: VisualQuery;
  onQueryGenerate: (query: Partial<VisualQuery>) => void;
}

interface Suggestion {
  id: string;
  type: 'optimization' | 'index' | 'join' | 'filter' | 'general';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  sql?: string;
}

export const AIQueryAssistant: React.FC<AIQueryAssistantProps> = ({
  currentQuery,
  onQueryGenerate,
}) => {
  const { currentSchema } = useAppStore();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-analyze when query changes
  useEffect(() => {
    if (currentQuery.tables.length > 0) {
      handleAnalyze();
    }
  }, [currentQuery.tables.length, currentQuery.joins.length, currentQuery.filters]);

  const handleGenerateQuery = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const schemaContext = currentQuery.tables.map(table => {
        const schemaTable = currentSchema?.tables.find(t => t.name === table.tableName);
        return {
          name: table.tableName,
          columns: schemaTable?.columns || [],
        };
      });

      const result = await generateQueryFromNaturalLanguage({
        prompt,
        schemaContext,
        currentQuery,
      });

      if (result.success && result.data) {
        onQueryGenerate(result.data.query);
        setPrompt('');
      }
    } catch (err: any) {
      console.error('Failed to generate query:', err);
      setError(err.userMessage || err.message || 'Failed to generate query from AI');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnalyze = async () => {
    if (currentQuery.tables.length === 0) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const schemaContext = currentQuery.tables.map(table => {
        const schemaTable = currentSchema?.tables.find(t => t.name === table.tableName);
        return {
          name: table.tableName,
          columns: schemaTable?.columns || [],
        };
      });

      const result = await analyzeQuery({
        query: currentQuery,
        schemaContext,
      });

      if (result.success && result.data) {
        setSuggestions(result.data.suggestions);
      }
    } catch (err: any) {
      console.error('Failed to analyze query:', err);
      // Don't show error for analysis - it's auto-triggered
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOptimize = async () => {
    if (currentQuery.tables.length === 0) return;

    setIsOptimizing(true);
    setError(null);

    try {
      const schemaContext = currentQuery.tables.map(table => {
        const schemaTable = currentSchema?.tables.find(t => t.name === table.tableName);
        return {
          name: table.tableName,
          columns: schemaTable?.columns || [],
        };
      });

      const result = await optimizeQuery({
        query: currentQuery,
        schemaContext,
      });

      if (result.success && result.data) {
        onQueryGenerate(result.data.optimizedQuery);
      }
    } catch (err: any) {
      console.error('Failed to optimize query:', err);
      setError(err.userMessage || err.message || 'Failed to optimize query');
    } finally {
      setIsOptimizing(false);
    }
  };

  const getImpactColor = (impact: Suggestion['impact']) => {
    switch (impact) {
      case 'high':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300';
      case 'medium':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300';
      case 'low':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Header */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Query Assistant</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Generate queries from natural language or get smart optimization suggestions
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Natural Language Input */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <h4 className="font-semibold text-gray-900 dark:text-white">Natural Language Query</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Describe your query in plain English
          </p>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleGenerateQuery();
                }
              }}
              placeholder="e.g., Find all users who registered in the last 30 days and made at least 3 purchases..."
              rows={4}
              className="font-mono text-sm"
            />

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Press Ctrl+Enter to generate
              </p>
              <Button
                onClick={handleGenerateQuery}
                disabled={!prompt.trim() || isGenerating}
                variant="primary"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Generate Query
                  </>
                )}
              </Button>
            </div>

            {/* Example Prompts */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">Example prompts:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  'Show all active users with their orders',
                  'Find products with low stock',
                  'List top 10 customers by revenue',
                  'Users who haven\'t logged in for 90 days',
                ].map((example, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(example)}
                    className="px-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700 rounded-full hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors text-gray-700 dark:text-gray-300"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Suggestions */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div 
          className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between cursor-pointer"
          onClick={() => setShowSuggestions(!showSuggestions)}
        >
          <div className="flex items-center gap-3">
            <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Smart Suggestions
                {isAnalyzing && <span className="text-sm text-gray-500 ml-2">(Analyzing...)</span>}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {suggestions.length} optimization{suggestions.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>
          <button className="text-gray-500 dark:text-gray-400">
            {showSuggestions ? '▼' : '▶'}
          </button>
        </div>

        {showSuggestions && (
          <div className="p-6">
            {suggestions.length === 0 ? (
              <div className="text-center py-8">
                {currentQuery.tables.length === 0 ? (
                  <>
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400 font-medium">No query to analyze</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Add tables to start building your query</p>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400 font-medium">Great! No issues detected</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Your query looks optimized</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className={`border rounded-lg p-4 ${getImpactColor(suggestion.impact)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {suggestion.impact === 'high' && <AlertCircle className="w-5 h-5" />}
                        {suggestion.impact === 'medium' && <Lightbulb className="w-5 h-5" />}
                        {suggestion.impact === 'low' && <TrendingUp className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{suggestion.title}</h4>
                          <span className="px-2 py-0.5 text-xs font-bold uppercase rounded-full bg-white/50 dark:bg-black/20">
                            {suggestion.impact} impact
                          </span>
                        </div>
                        <p className="text-sm opacity-90">{suggestion.description}</p>
                        {suggestion.sql && (
                          <pre className="mt-2 text-xs bg-white/50 dark:bg-black/20 p-2 rounded border border-current/20 overflow-x-auto">
                            {suggestion.sql}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {currentQuery.tables.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  variant="secondary"
                  className="w-full"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="w-4 h-4 mr-2" />
                      Re-analyze Query
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {currentQuery.tables.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Quick AI Actions</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              onClick={handleOptimize}
              disabled={isOptimizing}
              variant="secondary"
              className="justify-start"
            >
              {isOptimizing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Optimize Query
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              className="justify-start"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Suggest Indexes
            </Button>
            <Button
              variant="secondary"
              className="justify-start"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Explain Query
            </Button>
            <Button
              variant="secondary"
              className="justify-start"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Generate Tests
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
