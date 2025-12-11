/**
 * Clean up corrupted localStorage data
 * This fixes issues where selectedDatabase or selectedLanguage might be objects instead of strings
 */
export function cleanupStorage() {
  try {
    const storageKey = 'queryforge-storage';
    const stored = localStorage.getItem(storageKey);
    
    if (!stored) return;
    
    const data = JSON.parse(stored);
    const state = data.state;
    
    if (!state) return;
    
    let needsUpdate = false;
    
    // Fix selectedDatabase
    if (typeof state.selectedDatabase !== 'string') {
      console.warn('Fixing corrupted selectedDatabase in localStorage');
      state.selectedDatabase = 'postgresql';
      needsUpdate = true;
    }
    
    // Fix selectedLanguage
    if (typeof state.selectedLanguage !== 'string') {
      console.warn('Fixing corrupted selectedLanguage in localStorage');
      state.selectedLanguage = 'nodejs';
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      data.state = state;
      localStorage.setItem(storageKey, JSON.stringify(data));
      console.log('Storage cleaned up successfully');
    }
  } catch (error) {
    console.error('Error cleaning up storage:', error);
  }
}
