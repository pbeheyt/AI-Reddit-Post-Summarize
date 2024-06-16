const insertData = (data) => {
	const promptField = document.querySelector('#prompt-textarea');
	if (promptField) {
	  let commentsText = data.comments.map(comment => 
		`Author: ${comment.author}\nPopularity: ${comment.popularity}\nComment: ${comment.content}`
	  ).join('\n\n');
	  const textToInsert = `Title: ${data.postTitle}\n\nContent: ${data.postContent}\n\nComments:\n${commentsText}`;
	  
	  promptField.value = textToInsert;
  
	  // Trigger input event to ensure the change is registered
	  const inputEvent = new Event('input', { bubbles: true });
	  promptField.dispatchEvent(inputEvent);
	} else {
	  console.error('Prompt textarea not found');
	}
  };
  
  const sendPrompt = () => {
	const sendButton = document.querySelector('[data-testid="fruitjuice-send-button"]');
	if (sendButton) {
	  sendButton.click();
	} else {
	  console.error('Send button not found');
	}
  };
  
  // Function to scroll to the top of the last conversation element
  const scrollToTopOfLastElement = () => {
	try {
	  let elements = document.querySelectorAll('[data-testid^="conversation-turn"]');
	  if (elements.length > 0) {
		let lastElement = elements[elements.length - 1];
		lastElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
	  } else {
		console.error("No conversation elements found to scroll");
	  }
	} catch (error) {
	  console.error("Error scrolling to top of last element:", error);
	}
  };
  
  const handleProcess = () => {
	chrome.storage.local.get(['postTitle', 'postContent', 'comments'], (result) => {
	  insertData(result);
	  sendPrompt();
  
	  // Use MutationObserver to detect new elements added by ChatGPT
	  const observer = new MutationObserver((mutations) => {
		mutations.forEach((mutation) => {
		  if (mutation.addedNodes.length) {
			scrollToTopOfLastElement();
		  }
		});
	  });
  
	  observer.observe(document.body, { childList: true, subtree: true });
  
	  // Disconnect the observer after some time to prevent performance issues
	  setTimeout(() => {
		observer.disconnect();
	  }, 5000);
	});
  };
  
  // Use MutationObserver to wait for the element to be added to the DOM
  const observer = new MutationObserver((mutations, observer) => {
	if (document.querySelector('#prompt-textarea')) {
	  handleProcess();
	  observer.disconnect();
	}
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  