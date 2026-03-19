import { Campaign, CampaignSettings } from '../types/index';

export class MessageService {
  /**
   * Creates a new campaign.
   */
  static createCampaign(
    name: string,
    messages: string[],
    targetGroups: string[],
    settings: CampaignSettings
  ): Campaign {
    return {
      id: Math.random().toString(36).substr(2, 9),
      name,
      messages,
      targetGroups,
      status: 'draft',
      createdAt: Date.now(),
      stats: {
        total: targetGroups.length,
        sent: 0,
        failed: 0
      },
      settings
    };
  }

  /**
   * Validates a message for spintax and variables.
   */
  static validateMessage(text: string): { valid: boolean; error?: string } {
    if (!text || text.trim().length === 0) {
      return { valid: false, error: 'A mensagem não pode estar vazia.' };
    }
    
    // Simple spintax check
    const openBraces = (text.match(/\{/g) || []).length;
    const closeBraces = (text.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      return { valid: false, error: 'Erro de formatação no Spintax (chaves não fechadas).' };
    }

    return { valid: true };
  }
}
