/**
 * Platform Adapter Registry & Auto-Detector
 */
export const adapters = [];

export function getAdapterForUrl(url = window.location.href) {
  return adapters.find(adapter => adapter.isMatch(url)) || null;
}
