'use strict';

// Content script file will run in the context of web page.
// With content script you can manipulate the web pages using
// Document Object Model (DOM).
// You can also pass information to the parent extension.

// We execute this script by making an entry in manifest.json file
// under `content_scripts` property

// For more information on Content Scripts,
// See https://developer.chrome.com/extensions/content_scripts
const checkboxName = 'target-repo';
const $ = document.querySelector.bind(document);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

// location like `https://github.com/flyingsky?tab=repositories`
function getGithubAcountId() {
  return location.pathname.split('/').find(Boolean);
}

function insertCheckBeforeRepoNames() {
  $$('a[itemprop="name codeRepository"]').forEach((repoLink) => {
    const repoName = repoLink.innerText.trim();
    repoLink.parentNode.insertAdjacentHTML(
      'afterbegin',
      `<input type="checkbox" name="${checkboxName}" value="${repoName}">`
    );
  });
}

function confirmDelete() {
  const repos = getSelectedRepoNames();
  if (repos.length === 0) {
    return alert('Please select repo first');
  }

  const confirmed = confirm(
    'Are you sure to delete the selected repos: ' + repos.join(', ')
  );
  if (confirmed) {
    chrome.runtime.sendMessage(
      {
        type: 'delete',
        payload: {
          repos,
          account: getGithubAcountId(),
        },
      },
      (response) => {
        console.log(
          `Finish send delete message from tab to background: ${response}`
        );
      }
    );
  }
}

// TODO: the delete button could be replaced by the action button.
function insertDeleteButton() {
  if ($('#gbd_delete')) {
    console.log('The delete button exists, exit');
    return;
  }
  
  const deleteButton = document.createElement('button');
  deleteButton.innerText = 'Delete';
  deleteButton.style.position = 'sticky';
  deleteButton.style.left = '60%';
  deleteButton.style.bottom = '0px';
  deleteButton.style.width = '60px';
  deleteButton.style.height = '60px';
  deleteButton.style.borderRadius = '30px';
  deleteButton.style.background = 'red';
  deleteButton.style.border = '1px solid white';
  deleteButton.addEventListener('click', confirmDelete);
  deleteButton.id = 'gbd_delete';
  $('main').insertAdjacentElement('beforeend', deleteButton);
}

function getSelectedRepoNames() {
  return $$(`input[name="${checkboxName}"]`)
    .filter((check) => check.checked)
    .map((check) => check.value);
}

function init() {
  // Only insert the checkboxes and delete button into repository page.
  const isRepositoryListPage = location.href.includes('tab=repositories');
  if (isRepositoryListPage) {
    insertCheckBeforeRepoNames();
    insertDeleteButton();
  }
};

// Listen for message
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'init') {
    console.log('init the delete button');
    init();
  } else if (request.type === 'delete') {
    console.log(`Delete all repos:\n ${request.payload.repos.join('\n')}`);
  }

  // Send an empty response
  // See https://github.com/mozilla/webextension-polyfill/issues/130#issuecomment-531531890
  sendResponse({});
  return true;
});
