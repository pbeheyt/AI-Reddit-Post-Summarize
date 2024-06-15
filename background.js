chrome.runtime.onInstalled.addListener(() => {
	console.log("Extension installed.");
  });
  
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.status === 'complete' && tab.url && tab.url.includes('g/g-VXDFLZI2H-synthese-de-post')) {
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
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === 'log') {
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
  