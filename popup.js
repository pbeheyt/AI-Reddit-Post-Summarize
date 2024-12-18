document.getElementById('summarizeBtn').addEventListener('click', async () => {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTabUrl = tabs[0].url;

    if (currentTabUrl.includes('reddit.com') && currentTabUrl.includes('/comments/')) {
      // Get current useClaudeAI value before clearing storage
      const { useClaudeAI: currentSetting } = await chrome.storage.local.get(['useClaudeAI']);
      
      // Clear storage but keep the useClaudeAI setting
      await chrome.storage.local.clear();
      await chrome.storage.local.set({ 
        useClaudeAI: currentSetting !== undefined ? currentSetting : true 
      });

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