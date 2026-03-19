export interface Group {
  id: string;
  name: string;
  lastMessage?: string;
  participantsCount?: number;
  isFavorite?: boolean;
  isExcluded?: boolean;
  lists: string[];
}

export interface Campaign {
  id: string;
  name: string;
  messages: string[]; // Support for rotation
  media?: {
    type: 'image' | 'video' | 'audio' | 'document';
    url: string;
    filename: string;
  };
  targetGroups: string[];
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed';
  scheduledAt?: number;
  createdAt: number;
  stats: {
    total: number;
    sent: number;
    failed: number;
  };
  settings: CampaignSettings;
}

export interface CampaignSettings {
  minDelay: number; // seconds
  maxDelay: number; // seconds
  pauseAfterXMessages: number;
  pauseDuration: number; // minutes
  randomizeOrder: boolean;
  simulateTyping: boolean;
  spintaxEnabled: boolean;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  dailyLimit: number;
  hourlyLimit: number;
  antiBanMode: 'safe' | 'aggressive' | 'custom';
}

export interface LogEntry {
  id: string;
  campaignId: string;
  groupId: string;
  groupName: string;
  status: 'success' | 'error';
  timestamp: number;
  error?: string;
}
