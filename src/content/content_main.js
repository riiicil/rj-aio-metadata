/**
 * RJ AIO Metadata Extension — Content Script Router
 * Detects the active microstock platform and mounts the floating overlay HUD.
 * Reference: ADR-002 (Dual UI Strategy)
 */

let hud = null;

/**
 * Initializes and mounts the OverlayHUD instance.
 * Uses dynamic import for vanilla ES module execution in MV3 content script.
 */
async function getOrInitHUD() {
  if (hud) return hud;
  try {
    const overlayUrl = chrome.runtime.getURL('overlay/overlay.js');
    const { OverlayHUD } = await import(overlayUrl);
    hud = new OverlayHUD();
    await hud.init();
    return hud;
  } catch (err) {
    console.error('[RJ AIO Metadata] Failed to initialize OverlayHUD:', err);
    return null;
  }
}

// Auto-mount HUD on page load
getOrInitHUD().then((instance) => {
  if (instance) {
    console.log('[RJ AIO Metadata] Overlay HUD successfully mounted on:', window.location.hostname);
  }
});

// Listen for runtime messages from background service worker or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'PING_HUD') {
    sendResponse({ pong: true, isVisible: hud ? Boolean(hud.isVisible) : false });
    return;
  }

  if (message.action === 'GET_OVERLAY_STATE') {
    sendResponse({ success: true, isVisible: hud ? Boolean(hud.isVisible) : false });
    return;
  }

  if (message.action === 'TOGGLE_OVERLAY') {
    if (hud) {
      hud.toggle();
      sendResponse({ success: true, isVisible: Boolean(hud.isVisible) });
    } else {
      getOrInitHUD().then((instance) => {
        if (instance) {
          instance.show();
          sendResponse({ success: true, isVisible: Boolean(instance.isVisible) });
        } else {
          sendResponse({ success: false, error: 'Failed to mount overlay HUD.' });
        }
      });
      return true; // Keep message port open for async response
    }
  }
});
