'use strict';

import { isGithubRepository } from './common';

// All the tabs that are currently in the repository page.
const repositoryTabIds = new Set();

// With background scripts you can communicate with popup
// and contentScript files.
// For more information on background script,
// See https://developer.chrome.com/extensions/background_pages

// Listen to the tab change, for example the github repository next page, or
// switch to other page then switch back to the repository page, so we could
// notify the contentScript to update the dom to show delete button.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') {
    return;
  }

  // console.log(`Tab ${tabId} complete ${tab.url}, in repositoryTabIds: ${repositoryTabIds.has(tabId)}`);

  let message;
  if (isGithubRepository(tab.url)) {
    // A repository tab, init the delete button.
    repositoryTabIds.add(tabId);
    message = { type: 'init' };
  } else if (repositoryTabIds.has(tabId)) {
    // It was repository tab before, but now it's changed to other page, so hide the delete button.
    repositoryTabIds.delete(tabId);
    message = { type: 'deInit' };
  } else {
    // Not a repository tab, and not in the repositoryTabIds, so do nothing.
    return;
  }

  chrome.tabs.sendMessage(tabId, message, (response) => {
    if (chrome.runtime.lastError) {
      // This error often means the content script isn't injected
      // on the page, which is fine for pages you don't match.
      console.warn('Error sending message: ', chrome.runtime.lastError.message);
    } else {
      console.log('Content script responded:', response);
    }
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'delete' && sender.tab) {
    deleteRepos(request, sender, sendResponse);
    // Return true to tell the sendMessage this is an async processing.
    return true;
  }
});

async function deleteRepos(request, sender, sendResponse) {
  const { account, repos } = request.payload;
  for (const repo of repos) {
    await deleteRepo(sender.tab.id, account, repo);
  }

  sendResponse({
    type: 'delete',
    payload: { repos },
  });
}

async function deleteRepo(tabId, account, repo) {
  const repoId = `${account}/${repo}`;
  const url = `https://github.com/${repoId}/settings`;
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

      if (tab.url !== url) {
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
  document.querySelector('#dialog-show-repo-delete-menu-dialog').click();
  document.querySelector('#repo-delete-proceed-button').click();
  document.querySelector('#repo-delete-proceed-button').click();
  document.querySelector('#verification_field').value = repoId;
  document.querySelector('#repo-delete-proceed-button').disabled = false;
  document.querySelector('#repo-delete-proceed-button').click();
}
