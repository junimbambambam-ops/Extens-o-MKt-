/**
 * Content script for WhatsApp Web interaction.
 * This script runs in the context of web.whatsapp.com.
 */

console.log('WhatsGroup Pro: Content script loaded');

// Selectors for WhatsApp Web elements (these may need updates as WA changes)
const SELECTORS = {
  CHAT_LIST: '#pane-side',
  CHAT_ITEM: 'div[role="listitem"]',
  CHAT_NAME: 'span[title]',
  INPUT_FIELD: 'footer div[contenteditable="true"]',
  SEND_BUTTON: 'footer button span[data-icon="send"]',
  ATTACH_BUTTON: 'div[aria-label="Attach"]',
  FILE_INPUT: 'input[type="file"][accept*="image"]',
  TYPING_INDICATOR: 'header div[title="typing..."]',
};

/**
 * Sends a file to the currently active chat.
 */
async function sendFile(file: File, caption?: string) {
  const attachBtn = document.querySelector(SELECTORS.ATTACH_BUTTON) as HTMLElement;
  if (!attachBtn) throw new Error('Attach button not found');
  
  attachBtn.click();
  await new Promise(r => setTimeout(r, 1000));

  const fileInput = document.querySelector(SELECTORS.FILE_INPUT) as HTMLInputElement;
  if (!fileInput) throw new Error('File input not found');

  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  fileInput.files = dataTransfer.files;
  fileInput.dispatchEvent(new Event('change', { bubbles: true }));

  await new Promise(r => setTimeout(r, 2000)); // Wait for preview to load

  if (caption) {
    const captionInput = document.querySelector('div[contenteditable="true"][data-tab="10"]') as HTMLElement;
    if (captionInput) {
      await simulateTyping(caption, captionInput);
    }
  }

  const sendBtn = document.querySelector('span[data-icon="send"]') as HTMLElement;
  if (sendBtn) {
    sendBtn.click();
  }
}

/**
 * Simulates human typing in the input field.
 */
async function simulateTyping(text: string, element: HTMLElement) {
  element.focus();
  const dataTransfer = new DataTransfer();
  dataTransfer.setData('text/plain', text);
  
  const event = new ClipboardEvent('paste', {
    clipboardData: dataTransfer,
    bubbles: true,
    cancelable: true,
  });
  
  element.dispatchEvent(event);
  
  // Wait a bit to simulate processing
  await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
}

/**
 * Sends a message to the currently active chat.
 */
async function sendMessage(text: string, simulate: boolean = true) {
  const input = document.querySelector(SELECTORS.INPUT_FIELD) as HTMLElement;
  if (!input) throw new Error('Input field not found');

  if (simulate) {
    await simulateTyping(text, input);
  } else {
    input.innerText = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  const sendBtn = document.querySelector(SELECTORS.SEND_BUTTON) as HTMLElement;
  if (sendBtn) {
    sendBtn.click();
  } else {
    // Fallback: press Enter
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
    });
    input.dispatchEvent(enterEvent);
  }
}

/**
 * Scrapes groups from the sidebar.
 */
function scrapeGroups() {
  const groups: any[] = [];
  const items = document.querySelectorAll(SELECTORS.CHAT_ITEM);
  
  items.forEach(item => {
    const nameEl = item.querySelector(SELECTORS.CHAT_NAME);
    const name = nameEl?.getAttribute('title');
    // Simple heuristic: groups usually don't have phone numbers as titles
    // and often have a specific icon or structure. 
    // For now, we capture all and let the user filter.
    if (name) {
      groups.push({
        id: name, // In a real scenario, we'd need a more stable ID
        name: name,
        lastMessage: '', // Scrape if possible
      });
    }
  });
  
  return groups;
}

// Listen for messages from the background script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'SCRAPE_GROUPS') {
    const groups = scrapeGroups();
    sendResponse({ groups });
  }
  
  if (request.action === 'SEND_MESSAGE') {
    const handleSend = async () => {
      if (request.media && request.media.data) {
        // Convert base64 to File object
        const res = await fetch(request.media.data);
        const blob = await res.blob();
        const file = new File([blob], request.media.name, { type: request.media.type });
        await sendFile(file, request.text);
      } else {
        await sendMessage(request.text, request.simulate);
      }
    };

    handleSend()
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'SELECT_CHAT') {
    const chat = Array.from(document.querySelectorAll(SELECTORS.CHAT_NAME))
      .find(el => el.getAttribute('title') === request.name);
    
    if (chat) {
      (chat.closest(SELECTORS.CHAT_ITEM) as HTMLElement)?.click();
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Chat not found' });
    }
  }
});
