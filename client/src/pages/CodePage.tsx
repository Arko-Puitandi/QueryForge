import React, { useState, useEffect } from 'react';
import { Button, Card, CodeBlock, Loading, Select, Tabs, Textarea } from '../components/common';
import { VoiceInput } from '../components/voice';
import { DockerComposeGenerator } from '../components/code/DockerComposeGenerator';
import { APIDocGenerator } from '../components/code/APIDocGenerator';
import { useCode } from '../hooks';
import { useAppStore, useNotificationStore } from '../stores';
import { TargetLanguage, GeneratedFile } from '../types';
import { Mic, Keyboard, Download, FileCode, Save, FolderArchive } from 'lucide-react';
import { downloadFile, downloadAsZip } from '../lib/utils';

export const CodePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('entity');
  const [includeRepository, setIncludeRepository] = useState(true);
  const [includeService, setIncludeService] = useState(true);
  const [includeController, setIncludeController] = useState(false);
  const [framework, setFramework] = useState('');
  const [customRequirements, setCustomRequirements] = useState('');
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);

  const { generatedCode, isLoading, error, generateCode, generatePrisma, generateTypeORM, loadGeneratedCode } = useCode();
  const { currentSchema, selectedLanguage, setSelectedLanguage, pendingTemplateData, clearPendingTemplateData } = useAppStore();
  const { addNotification } = useNotificationStore();

  // Check for template data from app store (passed from history page)
  useEffect(() => {
    if (pendingTemplateData) {
      try {
        // Load the template data into the code generator
        loadGeneratedCode({
          files: pendingTemplateData.files,
          language: pendingTemplateData.language,
          framework: pendingTemplateData.framework,
          timestamp: new Date().toISOString(),
        });
        
        // Set the language to match the template
        setSelectedLanguage(pendingTemplateData.language as TargetLanguage);
        
        addNotification({
          type: 'success',
          title: 'Template Loaded',
          message: `Loaded ${pendingTemplateData.files.length} files from: ${pendingTemplateData.description}`,
        });
        
        // Clear the pending template data
        clearPendingTemplateData();
      } catch (error) {
        console.error('Failed to load template data:', error);
        clearPendingTemplateData();
        addNotification({
          type: 'error',
          title: 'Load Failed',
          message: 'Failed to load template data',
        });
      }
    }
  }, [pendingTemplateData, loadGeneratedCode, setSelectedLanguage, addNotification, clearPendingTemplateData]);

  const handleGenerateCode = async () => {
    await generateCode(undefined, undefined, {
      includeRepository,
      includeService,
      includeController,
      framework: framework || undefined,
    });
  };

  const handleGeneratePrisma = async () => {
    await generatePrisma();
  };

  const handleGenerateTypeORM = async () => {
    await generateTypeORM();
  };

  const languageOptions = [
    { value: 'java', label: 'Java' },
    { value: 'python', label: 'Python' },
    { value: 'nodejs', label: 'Node.js' },
    { value: 'csharp', label: 'C#' },
    { value: 'go', label: 'Go' },
  ];

  const frameworkOptions: Record<TargetLanguage, Array<{ value: string; label: string }>> = {
    java: [
      { value: '', label: 'Plain Java' },
      { value: 'spring', label: 'Spring Boot' },
      { value: 'hibernate', label: 'Hibernate' },
      { value: 'micronaut', label: 'Micronaut' },
    ],
    python: [
      { value: '', label: 'Plain Python' },
      { value: 'django', label: 'Django' },
      { value: 'sqlalchemy', label: 'SQLAlchemy' },
      { value: 'fastapi', label: 'FastAPI' },
    ],
    nodejs: [
      { value: '', label: 'Plain Node.js' },
      { value: 'express', label: 'Express.js' },
      { value: 'prisma', label: 'Prisma' },
      { value: 'typeorm', label: 'TypeORM' },
      { value: 'sequelize', label: 'Sequelize' },
    ],
    csharp: [
      { value: '', label: 'Plain C#' },
      { value: 'efcore', label: 'Entity Framework Core' },
      { value: 'dapper', label: 'Dapper' },
    ],
    go: [
      { value: '', label: 'Plain Go' },
      { value: 'gorm', label: 'GORM' },
      { value: 'sqlx', label: 'sqlx' },
    ],
  };

  const tabs = [
    { id: 'entity', label: 'Entities' },
    { id: 'repository', label: 'Repositories' },
    { id: 'service', label: 'Services' },
    { id: 'controller', label: 'Controllers' },
    { id: 'dto', label: 'DTOs' },
    { id: 'migration', label: 'Migrations' },
    { id: 'config', label: 'Config' },
    { id: 'docker', label: 'Docker Compose' },
    { id: 'apidocs', label: 'API Docs' },
    { id: 'other', label: 'Other' },
  ];

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedFileIndex(0); // Reset file selection when tab changes
  };

  const getLanguageExtension = (lang: TargetLanguage): string => {
    const extensions: Record<TargetLanguage, string> = {
      java: 'java',
      python: 'python',
      nodejs: 'typescript',
      csharp: 'csharp',
      go: 'go',
    };
    return extensions[lang];
  };

  const getCurrentFiles = (): GeneratedFile[] => {
    if (!generatedCode || !generatedCode.files) return [];
    return generatedCode.files.filter(f => f.type === activeTab);
  };

  const handleSaveFile = (file: GeneratedFile) => {
    downloadFile(file.content, file.filename, 'text/plain');
    addNotification({
      type: 'success',
      title: 'File Saved',
      message: `${file.filename} has been downloaded.`,
    });
  };

  const handleSaveAllFiles = () => {
    if (!generatedCode || !generatedCode.files || generatedCode.files.length === 0) return;
    
    // Download each file
    generatedCode.files.forEach((file, index) => {
      // Stagger downloads to prevent browser blocking
      setTimeout(() => {
        downloadFile(file.content, file.filename, 'text/plain');
      }, index * 200);
    });
    
    addNotification({
      type: 'success',
      title: 'All Files Saved',
      message: `${generatedCode.files.length} files have been downloaded.`,
    });
  };

  const handleDownloadZip = async () => {
    if (!generatedCode || !generatedCode.files || generatedCode.files.length === 0) return;
    
    try {
      const projectName = currentSchema?.name || 'generated-project';
      const zipFilename = `${projectName}-${selectedLanguage}-${Date.now()}.zip`;
      
      await downloadAsZip(generatedCode.files, zipFilename);
      
      addNotification({
        type: 'success',
        title: 'Project Downloaded',
        message: `${zipFilename} has been downloaded successfully.`,
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Download Failed',
        message: 'Failed to create ZIP file. Please try downloading individual files.',
      });
    }
  };

  const handleSaveCurrentTab = () => {
    const files = getCurrentFiles();
    if (files.length === 0) return;
    
    files.forEach((file, index) => {
      setTimeout(() => {
        downloadFile(file.content, file.filename, 'text/plain');
      }, index * 200);
    });
    
    addNotification({
      type: 'success',
      title: 'Files Saved',
      message: `${files.length} ${activeTab} file(s) have been downloaded.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Template Generator</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Generate complete project template with all necessary files from your database schema
        </p>
      </div>

      {!currentSchema && (
        <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              No schema loaded. Please generate a schema first to generate project template.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Section */}
        <Card title="Configuration" className="lg:col-span-1">
          <div className="space-y-4">
            <Select
              label="Target Language"
              options={languageOptions}
              value={selectedLanguage}
              onChange={(e) => {
                setSelectedLanguage(e.target.value as TargetLanguage);
                setFramework('');
              }}
            />

            <Select
              label="Framework"
              options={frameworkOptions[selectedLanguage]}
              value={framework}
              onChange={(e) => setFramework(e.target.value)}
            />

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Include Components
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeRepository}
                    onChange={(e) => setIncludeRepository(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Repositories / DAOs</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeService}
                    onChange={(e) => setIncludeService(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Services</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeController}
                    onChange={(e) => setIncludeController(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Controllers / Endpoints</span>
                </label>
              </div>
            </div>

            {/* Voice Input for Custom Requirements */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Custom Requirements (Optional)
                </label>
                <div className="flex rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setInputMode('text')}
                    className={`p-1 ${inputMode === 'text' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-600'}`}
                  >
                    <Keyboard className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('voice')}
                    className={`p-1 ${inputMode === 'voice' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-600'}`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              
              {inputMode === 'text' ? (
                <Textarea
                  placeholder="Add any specific requirements for template generation..."
                  value={customRequirements}
                  onChange={(e) => setCustomRequirements(e.target.value)}
                  rows={3}
                />
              ) : (
                <VoiceInput
                  onTranscript={(text) => setCustomRequirements(text)}
                  placeholder="Speak your custom requirements..."
                  showSettings={false}
                />
              )}
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleGenerateCode}
                isLoading={isLoading}
                disabled={!currentSchema}
                className="w-full"
              >
                Generate Project Template
              </Button>
              <Button
                variant="secondary"
                onClick={handleGeneratePrisma}
                disabled={!currentSchema || isLoading}
                className="w-full"
              >
                Generate Prisma Schema
              </Button>
              <Button
                variant="outline"
                onClick={handleGenerateTypeORM}
                disabled={!currentSchema || isLoading}
                className="w-full"
              >
                Generate TypeORM Entities
              </Button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Generated Code Section */}
        <Card title="Generated Code" className="lg:col-span-2" noPadding>
          {isLoading ? (
            <div className="p-6">
              <Loading size="lg" text="Generating project template..." />
            </div>
          ) : generatedCode && generatedCode.files && generatedCode.files.length > 0 ? (
            <>
              {/* Header with Save buttons */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {generatedCode.files.length} files generated ({generatedCode.framework || selectedLanguage})
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSaveCurrentTab}
                    disabled={getCurrentFiles().length === 0}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Save {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleDownloadZip}
                  >
                    <FolderArchive className="w-4 h-4 mr-1" />
                    Download ZIP
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveAllFiles}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save All
                  </Button>
                </div>
              </div>

              <Tabs tabs={tabs} activeTab={activeTab} onChange={handleTabChange} className="px-6" />
              
              {activeTab === 'docker' ? (
                <div className="p-6">
                  <DockerComposeGenerator databaseType={currentSchema?.databaseType} />
                </div>
              ) : activeTab === 'apidocs' ? (
                <div className="p-6">
                  <APIDocGenerator />
                </div>
              ) : getCurrentFiles().length > 0 ? (
                <div className="p-6 space-y-4">
                  {/* File list for current tab */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {getCurrentFiles().map((file, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedFileIndex(index)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                          selectedFileIndex === index
                            ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {file.filename}
                      </button>
                    ))}
                  </div>
                  
                  {/* Show selected file */}
                  {getCurrentFiles()[selectedFileIndex] && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {getCurrentFiles()[selectedFileIndex].filename}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSaveFile(getCurrentFiles()[selectedFileIndex])}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Save File
                        </Button>
                      </div>
                      <CodeBlock
                        code={getCurrentFiles()[selectedFileIndex].content}
                        language={getLanguageExtension(selectedLanguage)}
                        title={getCurrentFiles()[selectedFileIndex].filename}
                        maxHeight="400px"
                        showDownload
                        filename={getCurrentFiles()[selectedFileIndex].filename}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>No {activeTab} files in this generation</p>
                  <p className="text-sm mt-1">Try selecting a different tab or regenerate with different options</p>
                </div>
              )}
            </>
          ) : (
            <div className="p-6 text-center py-12 text-gray-500 dark:text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <p>Your generated project template will appear here</p>
              <p className="text-sm mt-2">Configure your preferences and click Generate Project Template</p>
            </div>
          )}
        </Card>
      </div>

      {/* Features Overview */}
      <Card title="Supported Technologies">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { name: 'Java', icon: '☕', frameworks: 'Spring, Hibernate' },
            { name: 'Python', icon: '🐍', frameworks: 'Django, FastAPI' },
            { name: 'Node.js', icon: '💚', frameworks: 'Express, Prisma' },
            { name: 'C#', icon: '💜', frameworks: 'EF Core, Dapper' },
            { name: 'Go', icon: '🐹', frameworks: 'GORM, sqlx' },
          ].map((tech) => (
            <div
              key={tech.name}
              className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 text-center"
            >
              <div className="text-3xl mb-2">{tech.icon}</div>
              <div className="font-medium text-gray-900 dark:text-white">{tech.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{tech.frameworks}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
