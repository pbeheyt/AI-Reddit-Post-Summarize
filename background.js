chrome.runtime.onInstalled.addListener(async () => {
    console.log("Extension installed.");
    chrome.contextMenus.create({
        id: "openLinkAndPerformScript",
        title: "Summarize linked post",
        contexts: ["link"]
    });

    chrome.contextMenus.create({
        id: "PerformScriptCurrentPage",
        title: "Summarize page post",
        contexts: ["page"]
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "openLinkAndPerformScript") {
        const url = info.linkUrl;
        await performScript(url);
    } else if (info.menuItemId === "PerformScriptCurrentPage") {
        const url = tab.url;
        await performScript(url);
    }
});

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === 'performScript') {
        await performScript(request.url);
    } else if (request.action === 'verifyStorage') {
        try {
            const storedData = await chrome.storage.local.get(['gptTabId', 'scriptInjected']);
            console.log("Verified stored data:", storedData);
            if (!storedData.gptTabId || storedData.scriptInjected === undefined) {
                console.warn("gptTabId or scriptInjected not set properly.", storedData);
            }
        } catch (error) {
            console.error("Error retrieving storage:", error);
        }
    }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        try {
            const response = await fetch(chrome.runtime.getURL('config.json'));
            const config = await response.json();
            if (tab.url.includes(config.chatgptUrl)) {
                const result = await chrome.storage.local.get(['gptTabId', 'scriptInjected']);
                if (tabId === result.gptTabId && !result.scriptInjected) {
                    await chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        files: ['gpt-content.js']
                    });
                    await chrome.storage.local.set({ scriptInjected: true });
                }
            }
        } catch (error) {
            console.error('Error fetching config:', error);
        }
    }
});

async function performScript(url) {
    if (url.includes('reddit.com') && url.includes('/comments/')) {
        try {
            const response = await fetch(chrome.runtime.getURL('config.json'));
            const config = await response.json();
            const chatgptUrl = config.chatgptUrl;

            const newTab = await chrome.tabs.create({ url, active: false });

			chrome.tabs.onUpdated.addListener(function redditTabListener(tabId, changeInfo, tab) {
				if (tabId === newTab.id && changeInfo.status === 'complete') {
					chrome.tabs.onUpdated.removeListener(redditTabListener);
				}
            });

            await waitForCommentsToLoad(newTab.id);

            await chrome.scripting.executeScript({
                target: { tabId: newTab.id },
                files: ['reddit-content.js']
            });

            chrome.tabs.remove(newTab.id);

            chrome.tabs.create({ url: chatgptUrl, active: false }, async (gptTab) => {
                await chrome.storage.local.set({ gptTabId: gptTab.id, scriptInjected: false });
                chrome.tabs.onUpdated.addListener(async function gptTabListener(tabId, changeInfo, tab) {
                    if (tabId === gptTab.id && changeInfo.status === 'complete' && tab.url.includes(chatgptUrl)) {
                        chrome.tabs.onUpdated.removeListener(gptTabListener);
                        await chrome.scripting.executeScript({
                            target: { tabId: gptTab.id },
                            files: ['gpt-content.js']
                        });
                        await chrome.storage.local.set({ scriptInjected: true });
                        await chrome.tabs.update(gptTab.id, { active: true });
                    }
                });
            });

        } catch (error) {
            console.error('Error fetching config:', error);
        }
    }
}

async function waitForCommentsToLoad(tabId) {
    await new Promise((resolve) => {
        const interval = setInterval(async () => {
            const [result] = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => {
                    return document.querySelectorAll('shreddit-comment').length > 0;
                }
            });
            if (result.result) {
                clearInterval(interval);
                resolve();
            }
        }, 200);
    });
}

