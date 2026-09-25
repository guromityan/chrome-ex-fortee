/**
 * Content scripts cannot be ES modules, so the real code is loaded as one.
 */
(async () => {
  try {
    const { start } = await import(chrome.runtime.getURL("src/main.js"));
    start();
  } catch (error) {
    console.error("[fortee hover preview] 起動に失敗しました", error);
  }
})();
