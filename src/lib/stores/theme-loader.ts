/**
 * Robust theme loader with retry logic
 */
import { browser } from '$app/environment';

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function loadThemeWithRetry(themeName: string, maxRetries = 3): Promise<any> {
  if (!browser) {
    console.log('[ThemeLoader] Not in browser, skipping theme load');
    return null;
  }

  // Use the correct path that we know works
  const themePath = `/themes/${themeName}.json`;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[ThemeLoader] Attempt ${attempt}/${maxRetries} loading ${themePath}`);
      
      const response = await fetch(themePath);
      
      if (response.ok) {
        const text = await response.text();
        const theme = JSON.parse(text);
        console.log(`[ThemeLoader] Successfully loaded theme: ${theme.name}`);
        return theme;
      } else {
        console.warn(`[ThemeLoader] HTTP ${response.status} for ${themePath}`);
      }
    } catch (error) {
      console.error(`[ThemeLoader] Attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        // Wait before retrying, with exponential backoff
        const waitTime = attempt * 500;
        console.log(`[ThemeLoader] Waiting ${waitTime}ms before retry...`);
        await delay(waitTime);
      }
    }
  }
  
  throw new Error(`Failed to load theme ${themeName} after ${maxRetries} attempts`);
}