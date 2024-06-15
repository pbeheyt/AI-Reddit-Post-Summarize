console.log("gpt-content.js script is running");

chrome.storage.local.get(['postTitle', 'postContent', 'comments'], (result) => {
  console.log("Retrieved data from storage:", result);

  let dataInserted = false;  // Flag to prevent multiple insertions

  // Function to insert data into the textarea, send it, and click the additional button
  const insertSendAndClickButton = () => {
    if (dataInserted) return;  // Exit if data has already been inserted

    const promptField = document.querySelector('#prompt-textarea');
    if (promptField) {
      let commentsText = result.comments.map(comment => 
        `Author: ${comment.author}\nPopularity: ${comment.popularity}\nComment: ${comment.content}`
      ).join('\n\n');
      const textToInsert = `Title: ${result.postTitle}\n\nContent: ${result.postContent}\n\nComments:\n${commentsText}`;
      
      promptField.value = textToInsert;

      // Trigger input event to ensure the change is registered
      const inputEvent = new Event('input', { bubbles: true });
      promptField.dispatchEvent(inputEvent);

      console.log("Data inserted into prompt textarea");

      // Find the send button and click it
      const sendButton = document.querySelector('[data-testid="fruitjuice-send-button"]');
      if (sendButton) {
        sendButton.click();
        console.log("Send button clicked");
        dataInserted = true;  // Set the flag to true after sending the data

        // Use MutationObserver to wait for the additional button to appear and click it
        const observer = new MutationObserver((mutations, observer) => {
          const additionalButton = document.querySelector('button.cursor-pointer.absolute.z-10.rounded-full.bg-clip-padding.border.text-token-text-secondary.border-token-border-light.right-1/2.juice\\:translate-x-1/2.bg-token-main-surface-primary.bottom-5');
          if (additionalButton) {
            additionalButton.click();
            console.log("Additional button clicked");
            observer.disconnect();  // Disconnect the observer after clicking the button
          }
        });

        observer.observe(document.body, { childList: true, subtree: true });
      } else {
        console.error('Send button not found');
      }
    } else {
      console.error('Prompt textarea not found');
    }
  };

  // Use MutationObserver to wait for the element to be added to the DOM
  const observer = new MutationObserver((mutations, observer) => {
    if (document.querySelector('#prompt-textarea')) {
      insertSendAndClickButton();
      observer.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
});
