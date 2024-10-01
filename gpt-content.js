(() => {
    const insertData = (data) => {
        const promptField = document.querySelector('#prompt-textarea');
        if (promptField) {
            let commentsText = data.comments.map(comment => 
                `Author: ${comment.author}\nPopularity: ${comment.popularity}\nComment: ${comment.content}`
            ).join('\n\n');
            const textToInsert = `Title: ${data.postTitle}\n\nContent: ${data.postContent}\n\nComments:\n${commentsText}`;
            
            promptField.focus();  // Ensure focus on the field
            
            // Use execCommand to simulate user input
            document.execCommand('insertText', false, textToInsert);

            // Trigger input and change events to ensure the change is registered
            const inputEvent = new InputEvent('input', { bubbles: true });
            promptField.dispatchEvent(inputEvent);

            const changeEvent = new Event('change', { bubbles: true });
            promptField.dispatchEvent(changeEvent);
        } else {
            console.error('Prompt textarea not found');
        }
    };

    // Define the sendPrompt function
    const sendPrompt = () => {
        setTimeout(() => {
            const sendButton = document.querySelector('[data-testid="send-button"]');
            if (sendButton) {
                console.log('Send button found, dispatching a simulated click event...');
                
                // Simulate a mouse click event
                const event = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true
                });
                sendButton.dispatchEvent(event);
            } else {
                console.error('Send button not found');
            }
        }, 1000);  // 1 second delay
    };

    const handleProcess = async () => {
        try {
            const result = await chrome.storage.local.get(['postTitle', 'postContent', 'comments']);
            console.log(result);  // Debugging: Check if the data is correct
            insertData(result);
            sendPrompt();  // Call the sendPrompt function here
        } catch (error) {
            console.error("Error handling process:", error);
        }
    };

    const observer = new MutationObserver(() => {
        const promptField = document.querySelector('#prompt-textarea');
        if (promptField) {
            console.log('Textarea found');
            observer.disconnect();  // Disconnect observer after finding the textarea
            handleProcess();  // Execute the main process
        }
    });

    // Start observing the document for changes
    observer.observe(document.body, { childList: true, subtree: true });
})();
