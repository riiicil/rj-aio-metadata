/**
 * RJ AIO Metadata Extension — Content Script Router
 * Detects the active microstock platform and mounts the floating overlay HUD.
 * Reference: ADR-002 (Dual UI Strategy)
 */

let hud = null;

/**
 * Initializes and mounts the OverlayHUD instance.
 * Uses dynamic import for vanilla ES module execution in MV3 content script.
 * @param {boolean} [initialVisible=true]
 */
async function getOrInitHUD(initialVisible = true) {
  if (hud) return hud;
  try {
    const overlayUrl = chrome.runtime.getURL('overlay/overlay.js');
    const { OverlayHUD } = await import(overlayUrl);
    hud = new OverlayHUD();
    if (!initialVisible) {
      hud.isVisible = false;
    }
    await hud.init();
    if (!initialVisible) {
      hud.hide(false);
    }
    return hud;
  } catch (err) {
    console.error('[RJ AIO Metadata] Failed to initialize OverlayHUD:', err);
    return null;
  }
}

// Auto-mount HUD on page load
if (typeof chrome !== 'undefined' && chrome.storage?.local) {
  chrome.storage.local.get(['rj_overlay_visible'], (res) => {
    const isVisible = res ? res.rj_overlay_visible !== false : true;
    getOrInitHUD(isVisible).then((instance) => {
      if (instance) {
        console.log('[RJ AIO Metadata] Overlay HUD successfully mounted on:', window.location.hostname);
      }
    });
  });
} else {
  getOrInitHUD(true).then((instance) => {
    if (instance) {
      console.log('[RJ AIO Metadata] Overlay HUD successfully mounted on:', window.location.hostname);
    }
  });
}

// Listen for runtime messages from background service worker or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'PING_HUD') {
    sendResponse({ pong: true, isVisible: Boolean(hud && hud.isVisible) });
    return;
  }

  if (message.action === 'GET_OVERLAY_STATE') {
    sendResponse({ success: true, isVisible: Boolean(hud && hud.isVisible) });
    return;
  }

  if (message.action === 'TOGGLE_OVERLAY') {
    if (hud) {
      if (hud.isVisible) {
        hud.hide();
        sendResponse({ success: true, isVisible: false });
      } else {
        hud.show();
        sendResponse({ success: true, isVisible: true });
      }
    } else {
      getOrInitHUD(true).then((instance) => {
        if (instance) {
          instance.show();
          sendResponse({ success: true, isVisible: true });
        } else {
          sendResponse({ success: false, error: 'Failed to mount overlay HUD.' });
        }
      });
      return true; // Keep message port open for async response
    }
  }
});
