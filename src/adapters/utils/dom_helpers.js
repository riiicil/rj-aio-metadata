/**
 * DOM Helpers Utility for Microstock Platform Adapters
 *
 * Provides resilient, single-string instant text injection (React prototype setter),
 * MutationObserver element waiting, cooldown delay generation, keyboard Enter simulation,
 * click dispatching, and thumbnail extraction.
 */

/**
 * Standard asynchronous sleep delay.
 * Supports optional AbortSignal for immediate cancellation.
 * @param {number} ms - Milliseconds to sleep.
 * @param {AbortSignal} [abortSignal=null] - Optional AbortSignal to cancel delay.
 * @returns {Promise<void>}
 */
export function sleep(ms, abortSignal = null) {
  if (ms <= 0) return Promise.resolve();
  if (abortSignal?.aborted) return Promise.reject(new Error('ABORTED'));

  return new Promise((resolve, reject) => {
    let timer = null;
    let onAbort = null;

    if (abortSignal) {
      onAbort = () => {
        if (timer) clearTimeout(timer);
        abortSignal.removeEventListener('abort', onAbort);
        reject(new Error('ABORTED'));
      };
      abortSignal.addEventListener('abort', onAbort);
    }

    timer = setTimeout(() => {
      if (abortSignal && onAbort) {
        abortSignal.removeEventListener('abort', onAbort);
      }
      resolve();
    }, ms);
  });
}

/**
 * Universal Cooldown Generator.
 * Generates a random delay between minMs and maxMs (inclusive) to mimic human pacing
 * and prevent bot detection / rate limiting. Respects AbortSignal to cancel immediately.
 * @param {number} [minMs=1000] - Minimum delay in milliseconds.
 * @param {number} [maxMs=5000] - Maximum delay in milliseconds.
 * @param {AbortSignal} [abortSignal=null] - Optional AbortSignal to cancel delay.
 * @returns {Promise<number>} Actual milliseconds elapsed.
 */
export async function randomDelay(minMs = 1000, maxMs = 5000, abortSignal = null) {
  const safeMin = Math.max(0, minMs);
  const safeMax = Math.max(safeMin, maxMs);
  const ms = Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
  await sleep(ms, abortSignal);
  return ms;
}

/**
 * Universal instant single-string text injector for controlled inputs (React, Vue, etc.).
 * Bypasses virtual DOM overrides by directly invoking the native prototype property setter
 * and dispatching synthetic input, change, and blur events.
 *
 * Rule: NO character-by-character or word-by-word typing.
 *
 * @param {HTMLInputElement|HTMLTextAreaElement|Object} element - Target input/textarea element.
 * @param {string} value - Text string to inject.
 * @returns {boolean} True if successfully set and dispatched, false otherwise.
 */
export function setNativeValue(element, value) {
  if (!element) return false;

  const safeValue = value ?? '';

  try {
    const prototype = (typeof HTMLTextAreaElement !== 'undefined' && element instanceof HTMLTextAreaElement)
      ? HTMLTextAreaElement.prototype
      : (typeof HTMLInputElement !== 'undefined' && element instanceof HTMLInputElement)
        ? HTMLInputElement.prototype
        : Object.getPrototypeOf(element);

    const descriptor = prototype ? Object.getOwnPropertyDescriptor(prototype, 'value') : null;
    const nativeSetter = descriptor?.set;

    if (nativeSetter) {
      nativeSetter.call(element, safeValue);
    } else {
      element.value = safeValue;
    }

    // Helper to safely construct events in browser or mock environments
    const createEvent = (type) => {
      if (typeof Event !== 'undefined') {
        return new Event(type, { bubbles: true });
      }
      return { type, bubbles: true };
    };

    if (typeof element.dispatchEvent === 'function') {
      element.dispatchEvent(createEvent('input'));
      element.dispatchEvent(createEvent('change'));
      element.dispatchEvent(createEvent('blur'));
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Waits for an element matching selector to appear in DOM within timeoutMs.
 * Returns immediately if element is already present.
 *
 * @param {string} selector - CSS selector to match.
 * @param {ParentNode|Document|Element} [parent=document] - Parent container or document.
 * @param {number} [timeoutMs=5000] - Timeout in milliseconds.
 * @returns {Promise<Element>} Resolves with matched element or rejects on timeout.
 */
export function waitForElement(selector, parent = (typeof document !== 'undefined' ? document : null), timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    if (!selector) {
      return reject(new Error('Selector is required'));
    }

    const container = parent || (typeof document !== 'undefined' ? document : null);
    if (!container || typeof container.querySelector !== 'function') {
      return reject(new Error('Valid parent container with querySelector is required'));
    }

    const existing = container.querySelector(selector);
    if (existing) {
      return resolve(existing);
    }

    if (typeof MutationObserver === 'undefined') {
      return reject(new Error('MutationObserver is not available'));
    }

    let timer = null;
    const observer = new MutationObserver(() => {
      const match = container.querySelector(selector);
      if (match) {
        cleanup();
        resolve(match);
      }
    });

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      observer.disconnect();
    };

    timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout waiting for element: ${selector}`));
    }, timeoutMs);

    const observeTarget = container.body || container;
    observer.observe(observeTarget, {
      childList: true,
      subtree: true
    });
  });
}

/**
 * Waits for an element matching selector to disappear from DOM within timeoutMs.
 * Returns immediately with true if element is already absent.
 *
 * @param {string} selector - CSS selector to check for disappearance.
 * @param {ParentNode|Document|Element} [parent=document] - Parent container or document.
 * @param {number} [timeoutMs=5000] - Timeout in milliseconds.
 * @returns {Promise<boolean>} Resolves true when element disappears or rejects on timeout.
 */
export function waitForElementToDisappear(selector, parent = (typeof document !== 'undefined' ? document : null), timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    if (!selector) {
      return reject(new Error('Selector is required'));
    }

    const container = parent || (typeof document !== 'undefined' ? document : null);
    if (!container || typeof container.querySelector !== 'function') {
      return reject(new Error('Valid parent container with querySelector is required'));
    }

    const existing = container.querySelector(selector);
    if (!existing) {
      return resolve(true);
    }

    if (typeof MutationObserver === 'undefined') {
      return reject(new Error('MutationObserver is not available'));
    }

    let timer = null;
    const observer = new MutationObserver(() => {
      const current = container.querySelector(selector);
      if (!current) {
        cleanup();
        resolve(true);
      }
    });

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      observer.disconnect();
    };

    timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout waiting for element to disappear: ${selector}`));
    }, timeoutMs);

    const observeTarget = container.body || container;
    observer.observe(observeTarget, {
      childList: true,
      subtree: true
    });
  });
}

/**
 * Simulates pressing the Enter key on an input or textarea element.
 * Essential for converting comma-separated text into interactive tag chips.
 *
 * @param {HTMLElement|Object} element - Target element to receive Enter key events.
 * @returns {boolean} True if events were dispatched, false otherwise.
 */
export function simulateEnterKey(element) {
  if (!element) return false;

  if (typeof element.focus === 'function') {
    element.focus();
  }

  const eventInit = {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true
  };

  const createKeyboardEvent = (type) => {
    if (typeof KeyboardEvent !== 'undefined') {
      try {
        return new KeyboardEvent(type, eventInit);
      } catch {
        // Fallback for environments where KeyboardEvent constructor is restricted
      }
    }
    if (typeof Event !== 'undefined') {
      const ev = new Event(type, { bubbles: true, cancelable: true });
      Object.assign(ev, eventInit);
      return ev;
    }
    return { type, ...eventInit };
  };

  if (typeof element.dispatchEvent === 'function') {
    element.dispatchEvent(createKeyboardEvent('keydown'));
    element.dispatchEvent(createKeyboardEvent('keypress'));
    element.dispatchEvent(createKeyboardEvent('keyup'));
    return true;
  }

  return false;
}

/**
 * Defensively clicks an element via both native .click() and synthetic MouseEvent.
 *
 * @param {HTMLElement|Object} element - Element to click.
 * @returns {boolean} True if clicked, false if element is null or undefined.
 */
export function simulateClick(element) {
  if (!element) return false;

  if (typeof element.click === 'function') {
    element.click();
  }

  const clickEvent = typeof MouseEvent !== 'undefined'
    ? new MouseEvent('click', { bubbles: true, cancelable: true, view: typeof window !== 'undefined' ? window : null })
    : typeof Event !== 'undefined'
      ? new Event('click', { bubbles: true, cancelable: true })
      : { type: 'click', bubbles: true, cancelable: true };

  if (typeof element.dispatchEvent === 'function') {
    element.dispatchEvent(clickEvent);
  }

  return true;
}

/**
 * Checks if a string is a non-empty, usable URL (not about:blank).
 * @param {*} val - Value to check.
 * @returns {boolean}
 */
function isValidImageUrl(val) {
  return typeof val === 'string' && val.trim().length > 0 && val.trim() !== 'about:blank';
}

/**
 * Extracts a thumbnail image URL from an img element or parent card container.
 * Follows a strict fallback hierarchy:
 * 1. Direct img: src -> dataset.src -> dataset.original -> currentSrc
 * 2. Parent card: querySelector('img') -> src -> dataset.src -> dataset.original -> currentSrc
 *
 * @param {HTMLElement|Object} imgOrCardElement - Image element or parent card container.
 * @returns {string|null} Valid image URL or null if not found.
 */
export function extractThumbnailUrl(imgOrCardElement) {
  if (!imgOrCardElement) return null;

  // Direct element checks
  if (isValidImageUrl(imgOrCardElement.src)) {
    return imgOrCardElement.src;
  }
  if (isValidImageUrl(imgOrCardElement.dataset?.src)) {
    return imgOrCardElement.dataset.src;
  }
  if (isValidImageUrl(imgOrCardElement.dataset?.original)) {
    return imgOrCardElement.dataset.original;
  }
  if (isValidImageUrl(imgOrCardElement.currentSrc)) {
    return imgOrCardElement.currentSrc;
  }

  // Nested image element inside card container
  if (typeof imgOrCardElement.querySelector === 'function') {
    const nestedImg = imgOrCardElement.querySelector('img');
    if (nestedImg) {
      if (isValidImageUrl(nestedImg.src)) {
        return nestedImg.src;
      }
      if (isValidImageUrl(nestedImg.dataset?.src)) {
        return nestedImg.dataset.src;
      }
      if (isValidImageUrl(nestedImg.dataset?.original)) {
        return nestedImg.dataset.original;
      }
      if (isValidImageUrl(nestedImg.currentSrc)) {
        return nestedImg.currentSrc;
      }
    }
  }

  return null;
}
