/**
 * RJ AIO Metadata Extension — Background Service Worker (Manifest V3)
 * Handles cross-origin AI Vision API requests and storage synchronization.
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[RJ AIO Metadata] Background Service Worker initialized.');
});
