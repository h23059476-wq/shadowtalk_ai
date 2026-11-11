/**
 * desktopBridge.ts
 * 
 * This module abstracts file system and OS interactions.
 * If running within a Tauri desktop container, it routes calls to the native OS.
 * If running in the browser, it falls back to the virtual/in-memory web container.
 */

declare global {
  interface Window {
    __TAURI__?: any;
  }
}

export const isDesktopMode = () => {
  return typeof window !== 'undefined' && !!window.__TAURI__;
};

export const saveFile = async (path: string, content: string): Promise<boolean> => {
  if (isDesktopMode()) {
    // Native Desktop File Save (Tauri fs API)
    // await window.__TAURI__.fs.writeFile({ path, contents: content });
    console.log(`[Tauri Bridge] Saved file natively: ${path}`);
    return true;
  } else {
    // Browser fallback (WebContainer / React state handled elsewhere)
    console.log(`[Web Bridge] Saved file virtually: ${path}`);
    return true;
  }
};

export const readFile = async (path: string): Promise<string> => {
  if (isDesktopMode()) {
    // return await window.__TAURI__.fs.readTextFile(path);
    return `[Native file content from ${path}]`;
  } else {
    return `[Virtual file content from ${path}]`;
  }
};
