document.addEventListener('DOMContentLoaded', () => {
    // Load saved preference
    chrome.storage.local.get(['useClaudeAI'], (result) => {
      document.getElementById('aiToggle').checked = result.useClaudeAI || false;
    });
  
    // Save preference when changed
    document.getElementById('aiToggle').addEventListener('change', (e) => {
      chrome.storage.local.set({ useClaudeAI: e.target.checked });
    });
  
    document.getElementById('summarizeBtn').addEventListener('click', async () => {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentTabUrl = tabs[0].url;
  
        if (currentTabUrl.includes('reddit.com') && currentTabUrl.includes('/comments/')) {
          await chrome.storage.local.clear();
          await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['reddit-content.js']
          });
  
          const response = await fetch(chrome.runtime.getURL('config.json'));
          const config = await response.json();
          
          const useClaudeAI = document.getElementById('aiToggle').checked;
          const aiUrl = useClaudeAI ? config.claudeUrl : config.chatgptUrl;
  
          const newTab = await chrome.tabs.create({ url: aiUrl, active: false });
          await chrome.storage.local.set({ 
            gptTabId: newTab.id, 
            scriptInjected: false,
            useClaudeAI: useClaudeAI,
            prePrompt: config.prePrompt
          });
          await chrome.tabs.update(newTab.id, { active: true });
        } else {
          alert('You are not on a Reddit post content page.');
        }
      } catch (error) {
        console.error('Error during execution:', error);
      }
    });
  });