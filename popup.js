document.addEventListener('DOMContentLoaded', () => {
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

                const newTab = await chrome.tabs.create({ url: config.chatgptUrl, active: false });
                await chrome.storage.local.set({ gptTabId: newTab.id, scriptInjected: false });
                await chrome.tabs.update(newTab.id, { active: true });
            } else {
                alert('You are not on a Reddit post content page.');
            }
        } catch (error) {
            console.error('Error during execution:', error);
        }
    });
});
