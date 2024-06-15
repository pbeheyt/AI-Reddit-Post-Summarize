document.addEventListener('DOMContentLoaded', () => {
	console.log("Popup loaded");
	
	document.getElementById('extractBtn').addEventListener('click', () => {
	  console.log("Extract button clicked");
	  
	  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		console.log("Active tab:", tabs[0].url);
		
		chrome.scripting.executeScript({
		  target: { tabId: tabs[0].id },
		  files: ['content.js']
		}, () => {
		  console.log("content.js executed. Redirecting to GPT page.");
  
		  // Redirect to GPT page after executing content.js
		  chrome.tabs.create({ url: 'https://chatgpt.com/g/g-bEmI4xKny-resume-express' }, (newTab) => {
			console.log("New GPT tab created. Tab ID:", newTab.id);
  
			// Store the new tab ID and set a flag to indicate script injection is pending
			chrome.storage.local.set({ gptTabId: newTab.id, scriptInjected: false }, () => {
			  console.log("gptTabId and scriptInjected stored:", { gptTabId: newTab.id, scriptInjected: false });
  
			  // Verify that the values are correctly stored
			  chrome.storage.local.get(['gptTabId', 'scriptInjected'], (storedData) => {
				console.log("Verified stored data:", storedData);
			  });
			});
		  });
		});
	  });
	});
  });
  
  