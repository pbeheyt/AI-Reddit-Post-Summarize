chrome.runtime.onInstalled.addListener(() => {
	console.log("Extension installed.");
});


chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	console.log("Tab updated. Tab ID:", tabId);
	console.log("Change Info:", changeInfo);

	chrome.storage.local.get(['gptTabId', 'scriptInjected'], (result) => {
		console.log("Stored Data:", result);

		const isCorrectTab = tabId === result.gptTabId;
		const isPageLoaded = changeInfo.status === 'complete';
		const isCorrectUrl = tab.url && tab.url.includes('g/g-bEmI4xKny-resume-express');
		const isScriptInjected = result.scriptInjected;

		console.log("Condition Check:");
		console.log("isCorrectTab:", isCorrectTab, "Expected:", result.gptTabId, "Actual:", tabId);
		console.log("isPageLoaded:", isPageLoaded, "Status:", changeInfo.status);
		console.log("isCorrectUrl:", isCorrectUrl, "URL:", tab.url);
		console.log("isScriptInjected:", isScriptInjected);

		if (isCorrectTab && isPageLoaded && isCorrectUrl && !isScriptInjected) {
		console.log("All conditions met. Injecting gpt-content.js into GPT tab.");

		// Inject gpt-content.js into the GPT page
		chrome.scripting.executeScript({
			target: { tabId: tabId },
			files: ['gpt-content.js']
		}, () => {
			console.log("gpt-content.js injected. Setting scriptInjected flag to true.");

			// Set the scriptInjected flag to true after the script has been executed
			chrome.storage.local.set({ scriptInjected: true }, () => {
			if (chrome.runtime.lastError) {
				console.error("Error setting scriptInjected flag:", chrome.runtime.lastError);
			} else {
				console.log("scriptInjected flag set to true.");

				// Clear the stored tab ID after the script has been executed
				chrome.storage.local.remove('gptTabId', () => {
				if (chrome.runtime.lastError) {
					console.error("Error clearing gptTabId:", chrome.runtime.lastError);
				} else {
					console.log("gptTabId cleared.");
				}
				});
			}
			});
		});
		} else {
		console.log("Conditions not met or script already injected. Script injection skipped.");
		}
	});
});
