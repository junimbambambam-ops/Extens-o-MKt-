import { Group, Campaign, LogEntry, AppSettings } from '../types/index';

export class StorageService {
  private static isExtension(): boolean {
    return typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.local;
  }

  static async getGroups(): Promise<Group[]> {
    if (!this.isExtension()) {
      const data = localStorage.getItem('groups');
      return data ? JSON.parse(data) : [];
    }
    const data = await chrome.storage.local.get('groups');
    return (data.groups as Group[]) || [];
  }

  static async saveGroups(groups: Group[]): Promise<void> {
    if (!this.isExtension()) {
      localStorage.setItem('groups', JSON.stringify(groups));
      return;
    }
    await chrome.storage.local.set({ groups });
  }

  static async getCampaigns(): Promise<Campaign[]> {
    if (!this.isExtension()) {
      const data = localStorage.getItem('campaigns');
      return data ? JSON.parse(data) : [];
    }
    const data = await chrome.storage.local.get('campaigns');
    return (data.campaigns as Campaign[]) || [];
  }

  static async saveCampaigns(campaigns: Campaign[]): Promise<void> {
    if (!this.isExtension()) {
      localStorage.setItem('campaigns', JSON.stringify(campaigns));
      return;
    }
    await chrome.storage.local.set({ campaigns });
  }

  static async getSettings(): Promise<AppSettings> {
    if (!this.isExtension()) {
      const data = localStorage.getItem('settings');
      return data ? JSON.parse(data) : {
        theme: 'light',
        dailyLimit: 200,
        hourlyLimit: 30,
        antiBanMode: 'safe'
      };
    }
    const data = await chrome.storage.local.get('settings');
    return (data.settings as AppSettings) || {
      theme: 'light',
      dailyLimit: 200,
      hourlyLimit: 30,
      antiBanMode: 'safe'
    };
  }

  static async saveSettings(settings: AppSettings): Promise<void> {
    if (!this.isExtension()) {
      localStorage.setItem('settings', JSON.stringify(settings));
      return;
    }
    await chrome.storage.local.set({ settings });
  }

  static async getLogs(): Promise<LogEntry[]> {
    if (!this.isExtension()) {
      const data = localStorage.getItem('logs');
      return data ? JSON.parse(data) : [];
    }
    const data = await chrome.storage.local.get('logs');
    return (data.logs as LogEntry[]) || [];
  }

  static async addLog(log: LogEntry): Promise<void> {
    const logs = await this.getLogs();
    logs.unshift(log);
    const slicedLogs = logs.slice(0, 1000);
    if (!this.isExtension()) {
      localStorage.setItem('logs', JSON.stringify(slicedLogs));
      return;
    }
    await chrome.storage.local.set({ logs: slicedLogs }); // Keep last 1000
  }
}
