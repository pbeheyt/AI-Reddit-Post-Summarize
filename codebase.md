# background.js

```js
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      try {
        const response = await fetch(chrome.runtime.getURL('config.json'));
        const config = await response.json();
        const result = await chrome.storage.local.get(['gptTabId', 'scriptInjected', 'useClaudeAI']);
        
        if (
          tabId === result.gptTabId && 
          !result.scriptInjected && 
          ((result.useClaudeAI && tab.url.includes('claude.ai')) || 
           (!result.useClaudeAI && tab.url.includes('chatgpt.com')))
        ) {
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: [result.useClaudeAI ? 'claude-content.js' : 'gpt-content.js']
          });
          await chrome.storage.local.set({ scriptInjected: true });
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }
  });
```

# claude-content.js

```js
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
```

# config.json

```json
{
  "chatgptUrl": "https://chatgpt.com/",
  "claudeUrl": "https://claude.ai/new",
  "prePrompt": "🔍 Analyse et résume ce post Reddit et ses commentaires en français. Formate ta réponse de manière adaptée aux personnes ayant un TDAH en suivant ces instructions :\n\n📌 Structure du résumé :\n1. TL;DR (En bref) ✨\n   - 2-3 phrases percutantes en français\n   - L'essentiel du post en un coup d'œil\n\n2. Analyse du contenu 🧠\n   - Points clés avec emojis\n   - Sections courtes et digestes\n   - Enchaînement logique des idées\n\n3. Structure détaillée 📊\n   a) Contexte\n      - Source du post\n      - Situation de départ\n   \n   b) Points essentiels\n      - Déroulement\n      - Arguments clés\n   \n   c) Réactions de la communauté\n      - Commentaires phares\n      - Opinions diverses\n\n4. 🎯 Commentaires Marquants\n   - Citations des meilleures réparties (traduites en français)\n   - Mention de l'auteur (u/username)\n   - Pour les longs commentaires : résumé + extrait clé\n   - Commentaires populaires avec analyse d'impact\n\n5. Analyse des commentaires 💬\n   - Top 3 des commentaires pertinents\n   - Citation traduite avec contexte\n   - Influence sur la discussion\n\n6. Données chiffrées 📈\n   - Statistiques importantes (votes, récompenses)\n   - Tendances des échanges\n   - Niveau de participation\n\n7. Conclusion 🎯\n   - Bilan des points clés\n   - Impacts possibles\n   - Questions en suspens\n\n⚠️ Consignes spécifiques :\n- Langage simple et accessible en français\n- Éviter le vocabulaire technique\n- Favoriser les explications claires\n- Utiliser des comparaisons si besoin\n- Pour les commentaires marquants :\n  • Court (<3 lignes) : citation complète traduite\n  • Long : résumé + citation clé traduite\n  • Toujours citer l'auteur\n  • Mentionner upvotes/récompenses\n\n🌈 Formatage :\n- Titres en gras\n- Puces avec emojis\n- Paragraphes courts (max 3-4 lignes)\n- Mise en valeur visuelle\n\nVoici le contenu à analyser :"
}
```

# content.js

```js
function extractTitle() {
	const titleElement = document.querySelector('h1');
	return titleElement ? titleElement.innerText : 'Title not found';
  }
  
  function extractPostContent() {
	const contentElement = document.querySelector('.text-neutral-content[slot="text-body"] .mb-sm .md.text-14');
	if (!contentElement) return 'Post content not found';
	
	let postContent = '';
	contentElement.querySelectorAll('p').forEach(paragraph => {
	  postContent += paragraph.innerText + '\n\n';
	});
	return postContent;
  }
  
  function extractComments() {
	const comments = [];
	document.querySelectorAll('shreddit-comment').forEach(comment => {
	  const author = comment.getAttribute('author');
	  const score = comment.getAttribute('score');
	  const commentContentElement = comment.querySelector('.md.text-14');
	  let commentContent = '';
	  if (commentContentElement) {
		commentContentElement.querySelectorAll('p').forEach(paragraph => {
		  commentContent += paragraph.innerText + '\n\n';
		});
	  }
	  comments.push({
		author: author,
		content: commentContent.trim(),
		popularity: score
	  });
	});
	return comments;
  }
  
  const postTitle = extractTitle();
  const postContent = extractPostContent();
  const comments = extractComments();
  
  chrome.storage.local.set({ postTitle, postContent, comments }, () => {
	console.log('Content saved:', { postTitle, postContent, comments });
  });
  
```

# gpt-content.js

```js
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
```

# images/icon16.png

This is a binary file of the type: Image

# images/icon48.png

This is a binary file of the type: Image

# images/icon128.png

This is a binary file of the type: Image

# manifest.json

```json
{
  "manifest_version": 3,
  "name": "AI Reddit Post Summarizer",
  "version": "1.0",
  "permissions": [
    "contextMenus",
    "activeTab",
    "scripting",
    "storage"
  ],
  "host_permissions": [
    "https://*.reddit.com/*",
    "https://chatgpt.com//*",
    "https://claude.ai/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": "images/icon128.png"
  },
  "icons": {
    "16": "images/icon16.png",
    "48": "images/icon48.png",
    "128": "images/icon128.png"
  },
  "content_scripts": [
    {
      "matches": ["*://*.reddit.com/*"],
      "js": ["reddit-content.js"]
    }
  ]
}
```

# package.json

```json
{
  "dependencies": {
    "ai-digest": "^1.0.7"
  }
}

```

# popup.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Reddit Post Summarize</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@500&display=swap');

    body {
      font-family: 'Roboto', sans-serif;
      background: linear-gradient(135deg, #1a1a1b, #2a2a2b);
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      color: #ffffff;
    }

    .container {
      background-color: #3c3c3c;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      text-align: center;
      width: 200px;
    }

    .toggle-container {
      margin-bottom: 15px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 60px;
      height: 34px;
      margin: 0 10px;
    }

    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #2196F3;
      transition: .4s;
      border-radius: 34px;
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 26px;
      width: 26px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }

    input:checked + .slider {
      background-color: #9C27B0;
    }

    input:checked + .slider:before {
      transform: translateX(26px);
    }

    .label {
      font-size: 14px;
      font-weight: bold;
    }

    button {
      background: #ff4500;
      color: #ffffff;
      padding: 12px 10px;
      font-size: 14px;
      font-weight: bold;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      transition: background 0.3s, transform 0.3s, box-shadow 0.3s;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      width: 100%;
      white-space: normal;
    }

    button:hover {
      background: #e03d00;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="toggle-container">
      <span class="label">GPT</span>
      <label class="toggle-switch">
        <input type="checkbox" id="aiToggle">
        <span class="slider"></span>
      </label>
      <span class="label">Claude</span>
    </div>
    <button type="button" id="summarizeBtn">Summarize</button>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

# popup.js

```js
document.addEventListener('DOMContentLoaded', () => {
  // Load saved preference with Claude as default (true instead of false)
  chrome.storage.local.get(['useClaudeAI'], (result) => {
    // If no preference is saved (undefined), default to true for Claude
    document.getElementById('aiToggle').checked = result.useClaudeAI !== undefined ? result.useClaudeAI : true;
  });

  // Save preference when changed
  document.getElementById('aiToggle').addEventListener('change', (e) => {
    chrome.storage.local.set({ useClaudeAI: e.target.checked });
  });

  document.getElementById('summarizeBtn').addEventListener('click', async () => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTabUrl = tabs[0].url;

      if (currentTabUrl.includes('reddit.com') && currentTabUrl.includes('/comments/')) {
        await chrome.storage.local.clear();
        await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['reddit-content.js']
        });

        const response = await fetch(chrome.runtime.getURL('config.json'));
        const config = await response.json();
        
        const useClaudeAI = document.getElementById('aiToggle').checked;
        const aiUrl = useClaudeAI ? config.claudeUrl : config.chatgptUrl;

        const newTab = await chrome.tabs.create({ url: aiUrl, active: false });
        await chrome.storage.local.set({ 
          gptTabId: newTab.id, 
          scriptInjected: false,
          useClaudeAI: useClaudeAI,
          prePrompt: config.prePrompt
        });
        await chrome.tabs.update(newTab.id, { active: true });
      } else {
        alert('You are not on a Reddit post content page.');
      }
    } catch (error) {
      console.error('Error during execution:', error);
    }
  });
});
```

# reddit-content.js

```js
(function() {
	function extractTitle() {
	  const titleElement = document.querySelector('h1');
	  return titleElement ? titleElement.innerText : 'Title not found';
	}
  
	function extractPostContent() {
	  const contentElement = document.querySelector('.text-neutral-content[slot="text-body"] .mb-sm .md.text-14');
	  if (!contentElement) return 'Post content not found';
  
	  let postContent = '';
	  contentElement.querySelectorAll('p').forEach(paragraph => {
		postContent += paragraph.innerText + '\n\n';
	  });
	  return postContent;
	}
  
	function extractComments() {
	  const comments = [];
	  document.querySelectorAll('shreddit-comment').forEach(comment => {
		const author = comment.getAttribute('author');
		const score = comment.getAttribute('score');
		const commentContentElement = comment.querySelector('.md.text-14');
		let commentContent = '';
		if (commentContentElement) {
		  commentContentElement.querySelectorAll('p').forEach(paragraph => {
			commentContent += paragraph.innerText + '\n\n';
		  });
		}
		comments.push({
		  author: author,
		  content: commentContent.trim(),
		  popularity: score
		});
	  });
	  return comments;
	}
  
	const postTitle = extractTitle();
	const postContent = extractPostContent();
	const comments = extractComments();
  
	chrome.storage.local.set({ postTitle, postContent, comments }, () => {
	  console.log('Content saved:', { postTitle, postContent, comments });
	});
  })();
  
```

