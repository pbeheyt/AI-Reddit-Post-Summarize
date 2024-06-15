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
  