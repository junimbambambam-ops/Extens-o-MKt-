/**
 * Content script for WhatsApp Web interaction.
 * This script runs in the context of web.whatsapp.com.
 */

console.log('Mkt Digital: Content script loaded');

// Selectors for WhatsApp Web elements (these may need updates as WA changes)
const SELECTORS = {
  CHAT_LIST: '#pane-side',
  SEARCH_INPUT: '#side div[contenteditable="true"][data-tab="3"], #side div[contenteditable="true"], #side .lexical-rich-text-input div[contenteditable="true"]',
  CHAT_ITEM: 'div[role="row"], div[role="listitem"]',
  CHAT_NAME: 'span[title], div[title], ._amie span',
  CHAT_HEADER_NAME: '#main header span[title], #main header div[title], #main header div[role="button"] span[title], #main header ._amie span, #main header [data-testid="conversation-info-header"]',
  INPUT_FIELD: '#main footer div[contenteditable="true"], #main footer .lexical-rich-text-input div[contenteditable="true"]',
  SEND_BUTTON: '#main footer span[data-icon="send"], #main footer button[aria-label="Send"], #main footer [data-testid="send"], #main footer button span[data-icon="send"]',
  ATTACH_BUTTON: '#main header span[data-icon="plus"], #main header span[data-icon="clip"], #main [data-testid="conversation-clip"], #main div[aria-label="Attach"], #main div[aria-label="Anexar"], #main header button[title="Attach"]',
  FILE_INPUT: 'input[type="file"]',
  TYPING_INDICATOR: '#main header div[title="typing..."], #main header ._amie span:contains("typing")',
  SEARCH_CLEAR_BTN: 'button[aria-label="Cancel search"], button[aria-label="Cancelar pesquisa"], span[data-icon="x-alt"], span[data-icon="search"], button[aria-label="Back"]',
};

/**
 * Simulates a real click on an element.
 */
function realClick(element: HTMLElement) {
  const events = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
  events.forEach(name => {
    const eventType = name.startsWith('pointer') ? PointerEvent : MouseEvent;
    element.dispatchEvent(new eventType(name, {
      bubbles: true,
      cancelable: true,
      view: window,
      buttons: 1
    }));
  });
  element.focus();
}

/**
 * Sends a file to the currently active chat.
 */
async function sendFile(file: File, caption?: string) {
  console.log('Mkt Digital: Attempting to send file', file.name);
  
  const attachBtn = document.querySelector(SELECTORS.ATTACH_BUTTON) as HTMLElement;
  if (!attachBtn) {
    console.error('Mkt Digital: Attach button not found with primary selectors');
    throw new Error('Botão de anexo não encontrado');
  }
  
  realClick(attachBtn);
  console.log('Mkt Digital: Clicked attach button');
  
  await new Promise(r => setTimeout(r, 1500));

  const fileInput = document.querySelector(SELECTORS.FILE_INPUT) as HTMLInputElement;
  if (!fileInput) {
    console.error('Mkt Digital: File input not found');
    throw new Error('Campo de seleção de arquivo não encontrado');
  }

  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  fileInput.files = dataTransfer.files;
  fileInput.dispatchEvent(new Event('change', { bubbles: true }));
  console.log('Mkt Digital: File selected and change event dispatched');

  await new Promise(r => setTimeout(r, 3000)); // Wait for preview to load

  if (caption) {
    console.log('Mkt Digital: Attempting to add caption');
    const captionInput = document.querySelector('div[contenteditable="true"][data-tab="10"], div[contenteditable="true"][data-tab="6"], div[contenteditable="true"][aria-label="Adicionar legenda"]') as HTMLElement;
    if (captionInput) {
      await simulateTyping(caption, captionInput);
      console.log('Mkt Digital: Caption typed');
    } else {
      console.warn('Mkt Digital: Caption input not found, skipping caption');
    }
  }

  const sendBtn = document.querySelector(SELECTORS.SEND_BUTTON) as HTMLElement;
  if (sendBtn) {
    realClick(sendBtn);
    console.log('Mkt Digital: Clicked send button');
  } else {
    console.warn('Mkt Digital: Send button not found, trying Enter key');
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
    });
    document.activeElement?.dispatchEvent(enterEvent);
  }
}

/**
 * Simulates human typing in the input field.
 */
async function simulateTyping(text: string, element: HTMLElement) {
  element.focus();
  
  // Use execCommand for more reliable text insertion
  try {
    document.execCommand('insertText', false, text);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  } catch (e) {
    console.warn('Mkt Digital: execCommand failed, falling back to paste');
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', text);
    
    const event = new ClipboardEvent('paste', {
      clipboardData: dataTransfer,
      bubbles: true,
      cancelable: true,
    });
    
    element.dispatchEvent(event);
  }
  
  // Wait a bit to simulate processing
  await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
}

/**
 * Sends a message to the currently active chat.
 */
async function sendMessage(text: string, simulate: boolean = true) {
  console.log('Mkt Digital: Sending message', text.substring(0, 20) + '...');
  const input = document.querySelector(SELECTORS.INPUT_FIELD) as HTMLElement;
  if (!input) throw new Error('Campo de mensagem não encontrado');

  if (simulate) {
    await simulateTyping(text, input);
  } else {
    input.innerText = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  const sendBtn = document.querySelector(SELECTORS.SEND_BUTTON) as HTMLElement;
  if (sendBtn) {
    realClick(sendBtn);
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
  console.log('Mkt Digital: Starting group scraping...');
  const groups: any[] = [];
  
  // Try multiple selectors for chat items
  let items = Array.from(document.querySelectorAll(SELECTORS.CHAT_ITEM));
  
  console.log(`Mkt Digital: Found ${items.length} potential chat items`);
  
  items.forEach(item => {
    const nameEl = item.querySelector(SELECTORS.CHAT_NAME);
    const name = nameEl?.getAttribute('title') || nameEl?.textContent;
    
    if (name) {
      // Check if it's likely a group
      // 1. Check for group icon
      const hasGroupIcon = !!item.querySelector('span[data-icon="default-group"]') || 
                           !!item.querySelector('span[data-icon="business-group"]') ||
                           !!item.querySelector('span[data-icon="community"]');
      
      // 2. Check aria-label for "group" or "grupo"
      const ariaLabel = item.getAttribute('aria-label')?.toLowerCase() || '';
      const isGroupLabel = ariaLabel.includes('group') || ariaLabel.includes('grupo');

      // 3. Check for "You" or "Você" (personal chat)
      const isPersonal = name === 'Você' || name === 'You';
      
      if (!isPersonal && (isGroupLabel || hasGroupIcon || !/^\+?\d[\d\s-]{7,20}$/.test(name))) {
        groups.push({
          id: name,
          name: name,
          lastMessage: item.querySelector('span[data-testid="last-msg-status"]')?.parentElement?.textContent || '',
          isGroup: isGroupLabel || hasGroupIcon
        });
      }
    }
  });
  
  // Remove duplicates
  const uniqueGroups = Array.from(new Map(groups.map(g => [g.name, g])).values());
  
  console.log(`Mkt Digital: Scraped ${uniqueGroups.length} unique groups/chats`);
  return uniqueGroups;
}

/**
 * Injects the Mkt Digital UI into WhatsApp Web.
 */
function injectUI() {
  if (document.getElementById('mkt-digital-container')) return;

  // Create container
  const container = document.createElement('div');
  container.id = 'mkt-digital-container';
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 10000;
    background: #09090b;
    display: none;
    border: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  `;

  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('index.html');
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
  `;

  container.appendChild(iframe);
  document.body.appendChild(container);

  // Create toggle button
  const toggleBtn = document.createElement('div');
  toggleBtn.id = 'mkt-digital-toggle';
  toggleBtn.innerHTML = `
    <div style="background: #10b981; color: white; padding: 12px; border-radius: 50%; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 8px 25px rgba(16,185,129,0.4); font-size: 28px; transition: transform 0.2s ease;">
      💰
    </div>
  `;
  toggleBtn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
  `;
  
  toggleBtn.onclick = () => {
    const isVisible = container.style.display === 'block';
    container.style.display = isVisible ? 'none' : 'block';
  };

  document.body.appendChild(toggleBtn);
}

// Inject UI on load
if (document.readyState === 'complete') {
  injectUI();
} else {
  window.addEventListener('load', injectUI);
}

// Keep UI alive if WhatsApp Web re-renders the body
const observer = new MutationObserver(() => {
  if (!document.getElementById('mkt-digital-container')) {
    injectUI();
  }
});
observer.observe(document.body, { childList: true });

// Listen for messages from the background script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'TOGGLE_UI') {
    const container = document.getElementById('mkt-digital-container');
    if (container) {
      const isVisible = container.style.display === 'block';
      container.style.display = isVisible ? 'none' : 'block';
    }
    sendResponse({ success: true });
  }

  if (request.action === 'RESIZE_UI') {
    const container = document.getElementById('mkt-digital-container');
    if (container) {
      if (request.size === 'small') {
        container.style.width = '800px';
        container.style.height = '600px';
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%)';
        container.style.borderRadius = '24px';
        container.style.overflow = 'hidden';
      } else {
        container.style.width = '100vw';
        container.style.height = '100vh';
        container.style.top = '0';
        container.style.left = '0';
        container.style.transform = 'none';
        container.style.borderRadius = '0';
      }
    }
    sendResponse({ success: true });
  }

  if (request.action === 'CLOSE_UI') {
    const container = document.getElementById('mkt-digital-container');
    if (container) {
      container.style.display = 'none';
    }
    sendResponse({ success: true });
  }
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
    const findAndClick = async (retryCount = 0): Promise<boolean> => {
      console.log(`Mkt Digital: Attempting to select chat "${request.name}" (Attempt ${retryCount + 1})`);
      
      const verifyHeader = () => {
        const headerNameEl = document.querySelector(SELECTORS.CHAT_HEADER_NAME);
        const headerName = headerNameEl?.getAttribute('title') || headerNameEl?.textContent || '';
        console.log(`Mkt Digital: Current header name: "${headerName}"`);
        
        const target = request.name.toLowerCase().trim();
        const current = headerName.toLowerCase().trim();
        
        // Check for exact match or if target is a significant part of current
        return current === target || current.includes(target) || target.includes(current);
      };

      if (verifyHeader()) {
        console.log('Mkt Digital: Chat already selected');
        return true;
      }

      // 0. Close any open sidebars (like Profile Info) that might be confusing selectors
      const closeSidebarBtn = document.querySelector('header span[data-icon="x"], button[aria-label="Close"], button[aria-label="Fechar"]') as HTMLElement;
      if (closeSidebarBtn && !document.querySelector('#main')) {
         // Only close if it's a sidebar and not the main chat
         console.log('Mkt Digital: Closing sidebar...');
         realClick(closeSidebarBtn);
         await new Promise(r => setTimeout(r, 500));
      }

      // 1. Try to find in visible list
      const chatElements = Array.from(document.querySelectorAll(SELECTORS.CHAT_NAME));
      let chat = chatElements.find(el => el.getAttribute('title')?.toLowerCase().trim() === request.name.toLowerCase().trim());
      
      if (chat) {
        const item = chat.closest('div[role="button"]') as HTMLElement || chat.closest(SELECTORS.CHAT_ITEM) as HTMLElement;
        if (item) {
          console.log('Mkt Digital: Found chat in visible list, clicking...');
          realClick(item);
          await new Promise(r => setTimeout(r, 2000));
          if (verifyHeader()) return true;
        }
      }

      // 2. Try to use search bar
      console.log('Mkt Digital: Using search bar...');
      
      // Clear search first by clicking the "X" or "Search" icon if it acts as a toggle/clear
      const clearBtn = document.querySelector(SELECTORS.SEARCH_CLEAR_BTN) as HTMLElement;
      if (clearBtn) {
        console.log('Mkt Digital: Clicking clear/search button...');
        realClick(clearBtn);
        await new Promise(r => setTimeout(r, 800));
      }

      const searchInput = document.querySelector(SELECTORS.SEARCH_INPUT) as HTMLElement;
      if (searchInput) {
        searchInput.focus();
        // Force clear content
        searchInput.innerText = '';
        document.execCommand('selectAll', false, undefined);
        document.execCommand('delete', false, undefined);
        
        await new Promise(r => setTimeout(r, 500));
        
        // Type the name
        console.log(`Mkt Digital: Typing "${request.name}" into search...`);
        document.execCommand('insertText', false, request.name);
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Wait for search results
        await new Promise(r => setTimeout(r, 3000));
        
        // Look for exact match in search results
        const searchResults = Array.from(document.querySelectorAll(SELECTORS.CHAT_NAME))
          .filter(el => el.getAttribute('title')?.toLowerCase().trim() === request.name.toLowerCase().trim());
        
        console.log(`Mkt Digital: Found ${searchResults.length} matches in search results`);
        
        if (searchResults.length > 0) {
          // Click the actual button/item, not just the row
          const item = searchResults[0].closest('div[role="button"]') as HTMLElement || searchResults[0].closest(SELECTORS.CHAT_ITEM) as HTMLElement;
          if (item) {
            console.log('Mkt Digital: Clicking search result...');
            realClick(item);
            
            await new Promise(r => setTimeout(r, 2000));
            
            // Clear search to restore list
            const finalClearBtn = document.querySelector(SELECTORS.SEARCH_CLEAR_BTN) as HTMLElement;
            if (finalClearBtn) {
              realClick(finalClearBtn);
            }
            
            await new Promise(r => setTimeout(r, 1000));
            if (verifyHeader()) return true;
          }
        }
      }
      
      if (retryCount < 2) {
        console.log('Mkt Digital: Retrying selection...');
        await new Promise(r => setTimeout(r, 2000));
        return findAndClick(retryCount + 1);
      }
      
      return false;
    };

    findAndClick()
      .then(found => sendResponse({ success: found, error: found ? undefined : 'Chat não encontrado ou não selecionado' }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
