/** True when running inside the Tauri desktop app rather than a browser. */
export function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
