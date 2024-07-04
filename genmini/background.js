chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startDeletion') {
      chrome.storage.local.get(['reposToDelete'], (result) => {
        const reposToDelete = result.reposToDelete;
        deleteRepos(reposToDelete, sender.tab.id); // Pass tab ID
      });
    }
  });
  
  async function deleteRepos(reposToDelete, tabId) {
    for (const repo of reposToDelete) {
      const repoName = repo.name;
      const repoUrl = repo.url;
  
      // Go to repo settings page
      chrome.tabs.update(tabId, { url: repoUrl + '/settings' });
  
      // Wait for settings page to load and automate deletion
      await new Promise(resolve => {
        const settingsObserver = new MutationObserver(() => {
          if (document.querySelector('#dialog-show-repo-delete-menu-dialog')) {
            // Start deletion process
            chrome.tabs.sendMessage(tabId, { action: 'clickButton', selector: '#dialog-show-repo-delete-menu-dialog' }, resolve);
            chrome.tabs.sendMessage(tabId, { action: 'clickButton', selector: '#repo-delete-proceed-button' });
            chrome.tabs.sendMessage(tabId, { action: 'clickButton', selector: '#repo-delete-proceed-button' }); // Click twice for confirmation
  
            // Input repo name and delete
            chrome.tabs.sendMessage(tabId, { action: 'inputVerificationField', value: repoName });
            chrome.tabs.sendMessage(tabId, { action: 'clickButton', selector: '#repo-delete-proceed-button' }, resolve);
          }
        });
        settingsObserver.observe(document, { childList: true, subtree: true });
      });
  
      // Add a short delay to allow the deletion to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  
    // Clear reposToDelete from storage
    chrome.storage.local.remove(['reposToDelete']);
  }
  