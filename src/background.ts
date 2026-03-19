import { StorageService } from './services/storageService';
import { AntiBanEngine } from './services/antiBanEngine';
import { Campaign, LogEntry } from './types/index';

console.log('WhatsGroup Pro: Background script loaded');

let activeCampaignId: string | null = null;
let isPaused = false;

/**
 * Main campaign execution loop.
 */
async function runCampaign(campaignId: string) {
  activeCampaignId = campaignId;
  isPaused = false;
  
  const campaigns = await StorageService.getCampaigns();
  const campaign = campaigns.find(c => c.id === campaignId);
  if (!campaign) return;

  campaign.status = 'running';
  await StorageService.saveCampaigns(campaigns);

  const targetGroups = campaign.settings.randomizeOrder 
    ? AntiBanEngine.shuffleArray(campaign.targetGroups) 
    : campaign.targetGroups;

  let sentCount = 0;

  for (const groupName of targetGroups) {
    if (activeCampaignId !== campaignId) break;
    
    while (isPaused) {
      await new Promise(r => setTimeout(r, 1000));
    }

    // 1. Select Chat
    const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
    if (tabs.length === 0) {
      console.error('WhatsApp Web tab not found');
      break;
    }
    const tabId = tabs[0].id!;

    try {
      // Select the chat
      await chrome.tabs.sendMessage(tabId, { action: 'SELECT_CHAT', name: groupName });
      await new Promise(r => setTimeout(r, 2000)); // Wait for chat to load

      // 2. Prepare Message
      let message = campaign.messages[Math.floor(Math.random() * campaign.messages.length)];
      if (campaign.settings.spintaxEnabled) {
        message = AntiBanEngine.processSpintax(message);
      }
      message = AntiBanEngine.replaceVariables(message, groupName);

      // 3. Send Message
      const response = await chrome.tabs.sendMessage(tabId, { 
        action: 'SEND_MESSAGE', 
        text: message,
        simulate: campaign.settings.simulateTyping,
        media: campaign.media ? {
          data: campaign.media.url,
          name: campaign.media.filename,
          type: campaign.media.type === 'image' ? 'image/png' : 'video/mp4' // Simple mapping for now
        } : undefined
      });

      if (response.success) {
        sentCount++;
        campaign.stats.sent++;
        await StorageService.addLog({
          id: Math.random().toString(36).substr(2, 9),
          campaignId,
          groupId: groupName,
          groupName,
          status: 'success',
          timestamp: Date.now()
        });
      } else {
        campaign.stats.failed++;
        await StorageService.addLog({
          id: Math.random().toString(36).substr(2, 9),
          campaignId,
          groupId: groupName,
          groupName,
          status: 'error',
          timestamp: Date.now(),
          error: response.error
        });
      }

      await StorageService.saveCampaigns(campaigns);

      // 4. Anti-Ban Delays
      if (sentCount < targetGroups.length) {
        if (AntiBanEngine.shouldPause(sentCount, campaign.settings)) {
          console.log(`Campaign paused for ${campaign.settings.pauseDuration} minutes`);
          await new Promise(r => setTimeout(r, campaign.settings.pauseDuration * 60 * 1000));
        } else {
          const delay = AntiBanEngine.getRandomDelay(campaign.settings);
          console.log(`Waiting ${delay / 1000}s before next message`);
          await new Promise(r => setTimeout(r, delay));
        }
      }

    } catch (err) {
      console.error('Error in campaign loop:', err);
    }
  }

  campaign.status = 'completed';
  await StorageService.saveCampaigns(campaigns);
  activeCampaignId = null;
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'WhatsGroup Pro',
    message: `Campanha "${campaign.name}" concluída!`
  });
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'START_CAMPAIGN') {
    runCampaign(request.campaignId);
    sendResponse({ success: true });
  }
  
  if (request.action === 'PAUSE_CAMPAIGN') {
    isPaused = true;
    sendResponse({ success: true });
  }

  if (request.action === 'RESUME_CAMPAIGN') {
    isPaused = false;
    sendResponse({ success: true });
  }

  if (request.action === 'STOP_CAMPAIGN') {
    activeCampaignId = null;
    sendResponse({ success: true });
  }
});

// Alarm for scheduled campaigns
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith('campaign_')) {
    const campaignId = alarm.name.split('_')[1];
    runCampaign(campaignId);
  }
});
