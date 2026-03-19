import { StorageService } from './services/storageService';
import { AntiBanEngine } from './services/antiBanEngine';
import { Campaign, LogEntry } from './types/index';

console.log('Mkt Digital: Background script loaded');

let activeCampaignId: string | null = null;
let isPaused = false;

/**
 * Main campaign execution loop.
 */
async function runCampaign(campaignId: string) {
  if (activeCampaignId && activeCampaignId !== campaignId) {
    console.log('Mkt Digital: Another campaign is already running');
    return;
  }
  
  activeCampaignId = campaignId;
  isPaused = false;
  
  const campaigns = await StorageService.getCampaigns();
  const campaignIndex = campaigns.findIndex(c => c.id === campaignId);
  if (campaignIndex === -1) {
    activeCampaignId = null;
    return;
  }
  const campaign = campaigns[campaignIndex];

  // Reset stats if starting a completed or failed campaign
  if (campaign.status === 'completed' || campaign.status === 'error') {
    campaign.stats.sent = 0;
    campaign.stats.failed = 0;
  }

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
      campaign.status = 'error';
      await StorageService.saveCampaigns(campaigns);
      break;
    }
    const tabId = tabs[0].id!;

    try {
      // Select the chat
      const selectResponse = await chrome.tabs.sendMessage(tabId, { action: 'SELECT_CHAT', name: groupName });
      
      if (!selectResponse || !selectResponse.success) {
        console.warn(`Mkt Digital: Chat "${groupName}" not found or failed to select`);
        campaign.stats.failed++;
        await StorageService.addLog({
          id: Math.random().toString(36).substr(2, 9),
          campaignId,
          groupId: groupName,
          groupName,
          status: 'error',
          timestamp: Date.now(),
          error: selectResponse?.error || 'Chat não encontrado na lista visível'
        });
        await StorageService.saveCampaigns(campaigns);
        continue; // Skip to next group
      }

      await new Promise(r => setTimeout(r, 3000)); // Wait for chat to load

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

      if (response && response.success) {
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
          error: response?.error || 'Falha ao enviar mensagem'
        });
      }

      await StorageService.saveCampaigns(campaigns);

      // 4. Anti-Ban Delays
      if (sentCount < targetGroups.length) {
        let delay = 0;
        if (AntiBanEngine.shouldPause(sentCount, campaign.settings)) {
          delay = campaign.settings.pauseDuration * 60 * 1000;
          console.log(`Campaign paused for ${campaign.settings.pauseDuration} minutes`);
        } else {
          delay = AntiBanEngine.getRandomDelay(campaign.settings);
          console.log(`Waiting ${delay / 1000}s before next message`);
        }

        // Update nextActionAt for UI
        const nextActionAt = Date.now() + delay;
        const currentCampaigns = await StorageService.getCampaigns();
        const currentIdx = currentCampaigns.findIndex(c => c.id === campaignId);
        if (currentIdx !== -1) {
          currentCampaigns[currentIdx].nextActionAt = nextActionAt;
          await StorageService.saveCampaigns(currentCampaigns);
        }

        await new Promise(r => setTimeout(r, delay));
        
        // Clear nextActionAt after delay
        const finalCampaigns = await StorageService.getCampaigns();
        const finalIdx = finalCampaigns.findIndex(c => c.id === campaignId);
        if (finalIdx !== -1) {
          delete finalCampaigns[finalIdx].nextActionAt;
          await StorageService.saveCampaigns(finalCampaigns);
        }
      }

    } catch (err) {
      console.error('Error in campaign loop:', err);
    }
  }

  campaign.status = 'completed';
  delete campaign.nextActionAt;
  await StorageService.saveCampaigns(campaigns);
  activeCampaignId = null;
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Mkt Digital',
    message: `Campanha "${campaign.name}" concluída!`
  });
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'START_CAMPAIGN') {
    runCampaign(request.campaignId);
    sendResponse({ success: true });
  }
  
  if (request.action === 'SCHEDULE_CAMPAIGN') {
    const { campaignId, scheduledAt } = request;
    const delayInMinutes = Math.max(1, Math.round((scheduledAt - Date.now()) / 60000));
    chrome.alarms.create(`campaign_${campaignId}`, { delayInMinutes });
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
