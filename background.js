chrome.runtime.onInstalled.addListener(() => {
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

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "openLinkAndPerformScript") {
        const url = info.linkUrl;
        performScript(url);
    } else if (info.menuItemId === "PerformScriptCurrentPage") {
        const url = tab.url;
        performScript(url);
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'performScript') {
        performScript(request.url);
    } else if (request.action === 'verifyStorage') {
        chrome.storage.local.get(['gptTabId', 'scriptInjected'], (storedData) => {
            if (chrome.runtime.lastError) {
                console.error("Error retrieving storage:", chrome.runtime.lastError);
            } else {
                console.log("Verified stored data:", storedData);
                if (!storedData.gptTabId || storedData.scriptInjected === undefined) {
                    console.warn("gptTabId or scriptInjected not set properly.", storedData);
                }
            }
        });
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        fetch(chrome.runtime.getURL('config.json'))
            .then(response => response.json())
            .then(config => {
                if (tab.url.includes(config.chatgptUrl)) {
                    chrome.storage.local.get(['gptTabId', 'scriptInjected'], (result) => {
                        if (tabId === result.gptTabId && !result.scriptInjected) {
                            chrome.scripting.executeScript({
                                target: { tabId: tabId },
                                files: ['gpt-content.js']
                            }, () => {
                                chrome.storage.local.set({ scriptInjected: true });
                            });
                        }
                    });
                }
            });
    }
});

function performScript(url) {
    if (url.includes('reddit.com') && url.includes('/comments/')) {
        fetch(chrome.runtime.getURL('config.json'))
            .then(response => response.json())
            .then(config => {
                const chatgptUrl = config.chatgptUrl;

                chrome.tabs.create({ url, active: false }, (newTab) => {
                    chrome.scripting.executeScript({
                        target: { tabId: newTab.id },
                        files: ['reddit-content.js']
                    }, () => {
                        chrome.tabs.onUpdated.addListener(function redditTabListener(tabId, changeInfo, tab) {
                            if (tabId === newTab.id && changeInfo.status === 'complete') {
                                chrome.tabs.onUpdated.removeListener(redditTabListener);
                                chrome.tabs.remove(newTab.id);
                                chrome.tabs.create({ url: chatgptUrl, active: false }, (gptTab) => {
                                    chrome.storage.local.set({ gptTabId: gptTab.id, scriptInjected: false }, () => {
                                        chrome.tabs.onUpdated.addListener(function gptTabListener(tabId, changeInfo, tab) {
                                            if (tabId === gptTab.id && changeInfo.status === 'complete' && tab.url.includes(chatgptUrl)) {
                                                chrome.tabs.onUpdated.removeListener(gptTabListener);

                                                chrome.scripting.executeScript({
                                                    target: { tabId: gptTab.id },
                                                    files: ['gpt-content.js']
                                                }, () => {
                                                    chrome.storage.local.set({ scriptInjected: true }, () => {
                                                        chrome.tabs.update(gptTab.id, { active: true });
                                                    });
                                                });
                                            }
                                        });
                                    });
                                });
                            }
                        });
                    });
                });
            })
            .catch(error => console.error('Error fetching config:', error));
    } else {
        alert('The link is not a valid Reddit post.');
    }
}
