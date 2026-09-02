/**
 * StorageService — Chrome Storage Sync & Local Data Management
 */
export class StorageService {
  static async getConfig() {
    return new Promise(resolve => {
      chrome.storage.sync.get(null, items => resolve(items || {}));
    });
  }

  static async saveConfig(data) {
    return new Promise(resolve => {
      chrome.storage.sync.set(data, () => resolve(true));
    });
  }
}
