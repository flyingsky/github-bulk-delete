// Wait for repository list to load (adjust selector as needed)
const repoListObserver = new MutationObserver(() => {
    const repoItems = document.querySelectorAll('.repo-list-item'); // Adjust selector
    repoItems.forEach(repoItem => {
      // Create checkbox
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'repo-checkbox'; // For styling
  
      // Insert checkbox before repo name
      const repoName = repoItem.querySelector('.repo-list-name');
      repoName.parentNode.insertBefore(checkbox, repoName);
    });
  
    // Create delete button
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete Selected';
    deleteButton.className = 'delete-button'; // For styling
    const repoList = document.querySelector('.repo-list'); // Adjust selector if needed
    repoList.parentNode.insertBefore(deleteButton, repoList.nextSibling);
    
    deleteButton.addEventListener('click', () => {
      const checkboxes = document.querySelectorAll('.repo-checkbox:checked');
      const reposToDelete = Array.from(checkboxes).map(checkbox => {
        const repoItem = checkbox.closest('.repo-list-item');
        const repoName = repoItem.querySelector('.repo-list-name a').textContent.trim();
        const repoUrl = repoItem.querySelector('.repo-list-name a').href;
        return { name: repoName, url: repoUrl };
      });
  
      // Store repo information and trigger background script
      chrome.storage.local.set({ reposToDelete }, () => {
        chrome.runtime.sendMessage({ action: 'startDeletion' });
      });
    });
  
    // Disconnect observer once done
    repoListObserver.disconnect();
  });
  
  repoListObserver.observe(document.body, { childList: true, subtree: true });
  
  // Message listener for handling DOM manipulation
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'clickButton' && message.selector) {
      const button = document.querySelector(message.selector);
      if (button) button.click();
      sendResponse(); // Optional: acknowledge message received
    } else if (message.action === 'inputVerificationField' && message.value) {
      const inputField = document.querySelector('#verification_field');
      if (inputField) {
        inputField.value = message.value;
        inputField.dispatchEvent(new Event('input')); // Trigger change event for React
      }
      sendResponse();
    }
  });
  