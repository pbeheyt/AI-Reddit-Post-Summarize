chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      try {
        const response = await fetch(chrome.runtime.getURL('config.json'));
        const config = await response.json();
        const result = await chrome.storage.local.get(['gptTabId', 'scriptInjected', 'useClaudeAI']);
        
        if (
          tabId === result.gptTabId && 
          !result.scriptInjected && 
          ((result.useClaudeAI && tab.url.includes('claude.ai')) || 
           (!result.useClaudeAI && tab.url.includes('chatgpt.com')))
        ) {
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: [result.useClaudeAI ? 'claude-content.js' : 'gpt-content.js']
          });
          await chrome.storage.local.set({ scriptInjected: true });
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }
  });