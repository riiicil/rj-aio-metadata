/**
 * Platform Adapter Registry & Auto-Detector
 * RJ AIO Metadata Extension
 *
 * Registers and exposes all 7 microstock platform adapters:
 * - Adobe Stock (adobestock)
 * - Shutterstock (shutterstock)
 * - Freepik (freepik)
 * - Vecteezy (vecteezy)
 * - Dreamstime (dreamstime)
 * - Depositphotos (depositphotos)
 * - MiriCanvas (miricanvas)
 */

import { AdobeStockAdapter } from './AdobeStockAdapter.js';
import { ShutterstockAdapter } from './ShutterstockAdapter.js';
import { FreepikAdapter } from './FreepikAdapter.js';
import { VecteezyAdapter } from './VecteezyAdapter.js';
import { DreamstimeAdapter } from './DreamstimeAdapter.js';
import { DepositphotosAdapter } from './DepositphotosAdapter.js';
import { MiriCanvasAdapter } from './MiriCanvasAdapter.js';

export {
  AdobeStockAdapter,
  ShutterstockAdapter,
  FreepikAdapter,
  VecteezyAdapter,
  DreamstimeAdapter,
  DepositphotosAdapter,
  MiriCanvasAdapter
};

export const adapters = [
  new AdobeStockAdapter(),
  new ShutterstockAdapter(),
  new FreepikAdapter(),
  new VecteezyAdapter(),
  new DreamstimeAdapter(),
  new DepositphotosAdapter(),
  new MiriCanvasAdapter()
];

/**
 * Finds the matching platform adapter for a given URL.
 * @param {string} [url] - Target URL (defaults to window.location.href if available).
 * @returns {import('./BaseAdapter.js').BaseAdapter|null} Matching adapter instance or null.
 */
export function getAdapterForUrl(url = (typeof window !== 'undefined' ? window.location?.href : '')) {
  if (!url) return null;
  return adapters.find(adapter => adapter.isMatch(url)) || null;
}

/**
 * Finds the platform adapter by unique platform ID.
 * @param {string} platformId - Platform identifier (e.g., 'adobestock', 'shutterstock').
 * @returns {import('./BaseAdapter.js').BaseAdapter|null} Matching adapter instance or null.
 */
export function getAdapterForPlatform(platformId) {
  if (!platformId) return null;
  return adapters.find(adapter => adapter.platformId === platformId) || null;
}

/**
 * Returns all registered platform adapter instances.
 * @returns {Array<import('./BaseAdapter.js').BaseAdapter>}
 */
export function getAllAdapters() {
  return [...adapters];
}
