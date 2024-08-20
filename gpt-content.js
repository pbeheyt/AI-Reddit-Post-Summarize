(() => {
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
        const sendButton = document.querySelector('[data-testid="send-button"]');
        if (sendButton) {
            sendButton.click();
        } else {
            console.error('Send button not found');
        }
    };

    const handleProcess = async () => {
        try {
            const result = await chrome.storage.local.get(['postTitle', 'postContent', 'comments']);
            insertData(result);
            sendPrompt();

            // The MutationObserver is removed, so there's no automatic scrolling
        } catch (error) {
            console.error("Error handling process:", error);
        }
    };

    // Use MutationObserver to wait for the element to be added to the DOM
    const observer = new MutationObserver((mutations, observer) => {
        if (document.querySelector('#prompt-textarea')) {
            handleProcess();
            observer.disconnect();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
