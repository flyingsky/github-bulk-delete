'use strict';

// With background scripts you can communicate with popup
// and contentScript files.
// For more information on background script,
// See https://developer.chrome.com/extensions/background_pages

function getRepoId(account, repo) {
  return `${account}/${repo}`;
}

function getRepoUrl(account, repo) {
  return `https://github.com/${getRepoId(account, repo)}/settings`;
}

function getRepoSettingsUrl(repoId) {
  return `https://github.com/${repoId}/settings`;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // TODO: delete this code later.
  if (request.type === 'GREETINGS') {
    const message = `Hi ${
      sender.tab ? 'Con' : 'Pop'
    }, my name is Bac. I am from Background. It's great to hear from you.`;

    // Log message coming from the `request` parameter
    console.log(request.payload.message);
    // Send a response message
    sendResponse({
      message,
    });
  }

  if (request.type === 'delete' && sender.tab) {
    deleteRepos(request, sender, sendResponse);
    // Return true to tell the sendMessage this is an async processing.
    return true;
  }
});

async function deleteRepos(request, sender, sendResponse) {
  const { account, repos } = request.payload;
  console.debug(`Try to delete repos ${repos}`);

  for (const repo of repos) {
    console.debug(`Try to delete ${account}/${repo}`);
    await deleteRepo(sender.tab.id, account, repo);
    console.debug(`Finish deleting ${account}/${repo}`);
  }

  sendResponse({
    type: 'delete',
    payload: { repos },
  });
}

async function deleteRepo(tabId, account, repo) {
  const repoId = getRepoId(account, repo);
  const url = getRepoUrl(account, repo);
  // Request to update tab to target repo settings page, but the tab may not
  // finish the updating after the await, which means the tab.url is still the
  // previous url. So don't trust the await return result Tab.
  await chrome.tabs.update(tabId, { url });

  await new Promise((resolve, reject) => {
    chrome.tabs.onUpdated.addListener(async function listener(
      tabId,
      changeInfo,
      tab
    ) {
      if (changeInfo.status !== 'complete') {
        return console.debug(`The tab onUpdated is not completed`);
      }

      if (tab.url !== getRepoSettingsUrl(repoId)) {
        return console.debug(
          `The tab url is ${tab.url}, which is not the settings page, so could not run the script to delete repo for [${repoId}]`
        );
      }

      // Remove the listener to avoid it's called for any tab onUpdated event.
      chrome.tabs.onUpdated.removeListener(listener);

      // Execute the script to auto delete repo.
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: deleteRepoById,
        args: [repoId],
      });

      // Once the delete is done, the github automatically redirect to
      // repository page. 
      // If we return directly to trigger next repo delete,
      // the tab will update to new repo settings page, but the github 
      // repository redirection will override it immediately, so the final tab
      // url is always repository and we don't have chance to delete the next
      // repo.
      // To avoid this, we simply hack it to wait for the repository
      // redirection, then try to delete next repo.
      setTimeout(resolve, 2000);
    });
  });
}

function deleteRepoById(repoId) {
  console.debug('xxxx===>before simulate the DOM actions  ' + repoId);
  document.querySelector('#dialog-show-repo-delete-menu-dialog').click();
  document.querySelector('#repo-delete-proceed-button').click();
  document.querySelector('#repo-delete-proceed-button').click();
  document.querySelector('#verification_field').value = repoId;
  document.querySelector('#repo-delete-proceed-button').disabled = false;
  document.querySelector('#repo-delete-proceed-button').click();
  console.debug('xxxx===>after simulate the DOM actions  ' + repoId);
}
