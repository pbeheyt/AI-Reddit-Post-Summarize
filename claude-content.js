(() => {
  function insertText(text) {
      let editorElement = document.querySelector('p[data-placeholder="How can Claude help you today?"]');
      
      if (!editorElement) {
          editorElement = document.querySelector('[contenteditable="true"]');
      }
      
      if (!editorElement) {
          console.error('Claude editor element not found');
          return false;
      }

      // Clear existing content
      editorElement.innerHTML = '';
      
      // Split the text into lines and create paragraphs
      const lines = text.split('\n');
      lines.forEach((line, index) => {
          const p = document.createElement('p');
          p.textContent = line;
          editorElement.appendChild(p);
          
          // Add a line break between paragraphs
          if (index < lines.length - 1) {
              editorElement.appendChild(document.createElement('br'));
          }
      });

      // Remove empty states
      editorElement.classList.remove('is-empty', 'is-editor-empty');

      // Trigger input event
      const inputEvent = new Event('input', { bubbles: true });
      editorElement.dispatchEvent(inputEvent);

      // Find and click the send button with the new selector
      setTimeout(() => {
          // Try multiple possible button selectors
          const sendButton = 
              document.querySelector('button[aria-label="Send message"]') ||
              document.querySelector('button[aria-label="Send Message"]') ||
              document.querySelector('button svg path[d*="M208.49,120.49"]')?.closest('button');

          if (sendButton) {
              console.log('Send button found, clicking...');
              
              // Ensure the button is enabled
              sendButton.disabled = false;
              
              // Create and dispatch multiple events for better compatibility
              ['mousedown', 'mouseup', 'click'].forEach(eventType => {
                  const event = new MouseEvent(eventType, {
                      view: window,
                      bubbles: true,
                      cancelable: true,
                      buttons: 1
                  });
                  sendButton.dispatchEvent(event);
              });
          } else {
              console.error('Send button not found');
          }
      }, 1000); // Increased delay to ensure content is properly inserted

      return true;
  }

  // Rest of the code remains the same
  const formatRedditData = (data) => {
      const title = data.postTitle || 'No title available';
      const content = data.postContent || 'No content available';
      const comments = Array.isArray(data.comments) ? data.comments : [];

      const formattedComments = comments
          .filter(comment => comment && comment.content)
          .map(comment => {
              const author = comment.author || 'Anonymous';
              const popularity = comment.popularity || '0';
              const content = comment.content.trim();
              
              return `Author: ${author}\nPopularity: ${popularity}\nComment: ${content}`;
          })
          .join('\n\n');

      return `Title: ${title}\n\nContent: ${content}\n\nComments:\n${formattedComments}`;
  };

  const handleProcess = async () => {
      try {
          const result = await chrome.storage.local.get(['prePrompt', 'postTitle', 'postContent', 'comments']);
          
          console.log('Retrieved data:', result);

          if (!result.prePrompt) {
              throw new Error('No prePrompt found in storage');
          }

          if (!result.postTitle || !result.postContent || !result.comments) {
              throw new Error('Reddit data missing from storage');
          }

          const redditContent = formatRedditData({
              postTitle: result.postTitle,
              postContent: result.postContent,
              comments: result.comments
          });

          const fullText = `${result.prePrompt}\n\n${redditContent}`;
          
          console.log('Attempting to insert text:', fullText);

          const success = insertText(fullText);
          
          if (success) {
              console.log('Message successfully inserted');
          } else {
              throw new Error('Failed to insert message');
          }
      } catch (error) {
          console.error('Error in handling process:', error);
      }
  };

  // Initialize process when the page is ready
  const observerConfig = { childList: true, subtree: true };
  let retryCount = 0;
  const MAX_RETRIES = 10;

  const observer = new MutationObserver(() => {
      const editorElement = document.querySelector('p[data-placeholder="How can Claude help you today?"]') || 
                          document.querySelector('[contenteditable="true"]');
      
      if (editorElement) {
          console.log('Editor element found');
          observer.disconnect();
          handleProcess();
      } else {
          retryCount++;
          if (retryCount >= MAX_RETRIES) {
              observer.disconnect();
              console.error('Failed to find editor element after maximum retries');
          }
      }
  });

  const startObserver = () => {
      if (document.readyState === 'complete') {
          observer.observe(document.body, observerConfig);
      } else {
          window.addEventListener('load', () => {
              observer.observe(document.body, observerConfig);
          });
      }
  };

  startObserver();
})();