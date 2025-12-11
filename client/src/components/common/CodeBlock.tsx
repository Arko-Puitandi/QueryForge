import React, { useState } from 'react';
import { cn, copyToClipboard, downloadFile } from '../../lib/utils';
import { Button } from './Button';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAppStore } from '../../stores';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  showLineNumbers?: boolean;
  maxHeight?: string;
  className?: string;
  filename?: string;
  showCopy?: boolean;
  showDownload?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'sql',
  title,
  showLineNumbers = true,
  maxHeight = '400px',
  className,
  filename,
  showCopy = true,
  showDownload = false,
}) => {
  const [copied, setCopied] = useState(false);
  const { theme } = useAppStore();

  const handleCopy = async () => {
    await copyToClipboard(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const extension = getFileExtension(language);
    downloadFile(code, filename || `code.${extension}`, 'text/plain');
  };

  const getFileExtension = (lang: string): string => {
    const extensions: Record<string, string> = {
      sql: 'sql',
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      csharp: 'cs',
      go: 'go',
      json: 'json',
    };
    return extensions[lang] || 'txt';
  };

  return (
    <div className={cn('rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700', className)}>
      {(title || showCopy || showDownload) && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title || language.toUpperCase()}
          </span>
          <div className="flex items-center gap-2">
            {showDownload && (
              <Button size="sm" variant="ghost" onClick={handleDownload}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </Button>
            )}
            {showCopy && (
              <Button size="sm" variant="ghost" onClick={handleCopy}>
                {copied ? (
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </Button>
            )}
          </div>
        </div>
      )}
      <div style={{ maxHeight, overflow: 'auto' }}>
        <SyntaxHighlighter
          language={language}
          style={theme === 'dark' ? oneDark : oneLight}
          showLineNumbers={showLineNumbers}
          customStyle={{
            margin: 0,
            borderRadius: 0,
            fontSize: '14px',
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};
