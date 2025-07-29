/**
 * Simplified theme loading for debugging
 */
import { browser } from '$app/environment';

export async function loadThemeSimple(themeName: string): Promise<any> {
  console.log(`[SimpleTheme] Loading theme: ${themeName}`);
  console.log(`[SimpleTheme] Browser: ${browser}`);

  if (!browser) {
    console.log('[SimpleTheme] Not in browser, returning null');
    return null;
  }

  const paths = [
    `/themes/${themeName}.json`,
    `./themes/${themeName}.json`,
    `/static/themes/${themeName}.json`,
    `themes/${themeName}.json`
  ];

  for (const path of paths) {
    try {
      console.log(`[SimpleTheme] Trying path: ${path}`);
      const response = await fetch(path);
      console.log(`[SimpleTheme] Response status: ${response.status}, OK: ${response.ok}`);

      if (response.ok) {
        const text = await response.text();
        console.log(`[SimpleTheme] Got text, length: ${text.length}`);
        const json = JSON.parse(text);
        console.log(`[SimpleTheme] Success! Theme name: ${json.name}`);
        return json;
      }
    } catch (error) {
      console.error(`[SimpleTheme] Error with path ${path}:`, error);
    }
  }

  console.error('[SimpleTheme] Failed to load theme from all paths');
  return null;
}
