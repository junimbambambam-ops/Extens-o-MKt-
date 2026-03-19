import { CampaignSettings } from '../types';

export class AntiBanEngine {
  /**
   * Generates a random delay between min and max seconds.
   */
  static getRandomDelay(settings: CampaignSettings): number {
    const min = settings.minDelay * 1000;
    const max = settings.maxDelay * 1000;
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  /**
   * Checks if a pause is needed based on the number of messages sent.
   */
  static shouldPause(sentCount: number, settings: CampaignSettings): boolean {
    if (settings.pauseAfterXMessages <= 0) return false;
    return sentCount > 0 && sentCount % settings.pauseAfterXMessages === 0;
  }

  /**
   * Processes Spintax in a message.
   * Format: {Olá|Oi|Fala}
   */
  static processSpintax(text: string): string {
    return text.replace(/\{([^{}]+)\}/g, (match, options) => {
      const choices = options.split('|');
      return choices[Math.floor(Math.random() * choices.length)];
    });
  }

  /**
   * Replaces dynamic variables in a message.
   */
  static replaceVariables(text: string, groupName: string): string {
    const now = new Date();
    return text
      .replace(/{nome_grupo}/g, groupName)
      .replace(/{data}/g, now.toLocaleDateString())
      .replace(/{hora}/g, now.toLocaleTimeString());
  }

  /**
   * Shuffles an array randomly.
   */
  static shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }
}
