(() => {
    function insertText(text) {
        const editorDiv = document.querySelector('#prompt-textarea.ProseMirror');
        
        if (!editorDiv) {
            console.error('GPT editor div not found');
            return false;
        }

        try {
            // Clear existing content
            editorDiv.innerHTML = '';
            
            // Split the text into paragraphs and create p elements
            const paragraphs = text.split('\n');
            paragraphs.forEach((paragraph, index) => {
                if (paragraph.trim() === '') {
                    // Add empty paragraph with break
                    const p = document.createElement('p');
                    p.appendChild(document.createElement('br'));
                    editorDiv.appendChild(p);
                } else {
                    // Add text paragraph
                    const p = document.createElement('p');
                    p.textContent = paragraph;
                    editorDiv.appendChild(p);
                }
            });

            // Remove placeholder class if it exists
            const placeholderP = editorDiv.querySelector('p.placeholder');
            if (placeholderP) {
                placeholderP.classList.remove('placeholder');
            }

            // Focus the editor
            editorDiv.focus();

            // Dispatch input event
            const inputEvent = new Event('input', { bubbles: true });
            editorDiv.dispatchEvent(inputEvent);

            // Find and click the send button
            setTimeout(() => {
                const sendButton = document.querySelector('button[data-testid="send-button"]:not(:disabled)');
                if (sendButton) {
                    console.log('Send button found, clicking...');
                    
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
                    console.error('Send button not found or disabled');
                }
            }, 1000);

            return true;
        } catch (error) {
            console.error('Error inserting text:', error);
            return false;
        }
    }

    const formatRedditData = (data) => {
        // Ensure all data properties exist
        const title = data.postTitle || 'No title available';
        const content = data.postContent || 'No content available';
        const comments = Array.isArray(data.comments) ? data.comments : [];

        // Format comments, handling missing or undefined values
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
            // Get both prePrompt and Reddit data in a single storage call
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
        const editorDiv = document.querySelector('#prompt-textarea.ProseMirror');
        
        if (editorDiv) {
            console.log('Editor div found');
            observer.disconnect();
            handleProcess();
        } else {
            retryCount++;
            if (retryCount >= MAX_RETRIES) {
                observer.disconnect();
                console.error('Failed to find editor div after maximum retries');
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