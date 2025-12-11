import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadAsZip(files: Array<{ path: string; filename: string; content: string }>, zipFilename: string) {
  const JSZip = (await import('jszip')).default;
  const { saveAs } = await import('file-saver');
  
  const zip = new JSZip();
  
  files.forEach(file => {
    const fullPath = file.path + file.filename;
    zip.file(fullPath, file.content);
  });
  
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, zipFilename);
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Remove SQL comments from a query string.
 * Removes both single-line and multi-line comments.
 */
export function stripSqlComments(sql: string): string {
  if (!sql) return sql;
  
  let result = sql;
  
  // Remove multi-line comments /* ... */
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Remove single-line comments -- ...
  result = result.replace(/--[^\n]*/g, '');
  
  // Remove extra whitespace and blank lines
  result = result
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
  
  // Normalize whitespace
  result = result.replace(/\s+/g, ' ').trim();
  
  return result;
}
