function logToBackground(message) {
	chrome.runtime.sendMessage({ action: 'log', message: message });
}
  
  document.addEventListener('DOMContentLoaded', () => {
	document.getElementById('extractBtn').addEventListener('click', () => {
	  chrome.storage.local.clear(() => {
	    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		  chrome.scripting.executeScript({
		    target: { tabId: tabs[0].id },
		    files: ['content.js']
		  }, () => {
		    chrome.tabs.create({ url: 'https://chatgpt.com/g/g-VXDFLZI2H-synthese-de-post', active: false }, (newTab) => {
			  chrome.storage.local.set({ gptTabId: newTab.id, scriptInjected: false }, () => {
			    chrome.tabs.update(newTab.id, { active: true });
			  });
		    });
		  });
	    });
	  });	
	});
  });
  