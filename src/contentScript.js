'use strict';

import { isGithubRepository } from './common';

// Content script file will run in the context of web page.
// With content script you can manipulate the web pages using
// Document Object Model (DOM).
// You can also pass information to the parent extension.

// We execute this script by making an entry in manifest.json file
// under `content_scripts` property

const PREFIX = 'gbd';
const CHECKBOX_NAME = `${PREFIX}_target_repo`;
const DELETE_BUTTON_ID = `${PREFIX}_delete`;

const $ = document.querySelector.bind(document);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

// location like `https://github.com/flyingsky?tab=repositories`
const getGithubAcountId = () => location.pathname.split('/').find(Boolean);

const getDeleteButton = () => $(`#${DELETE_BUTTON_ID}`);

const getSelectedRepoNames = () =>
  $$(`input[name="${CHECKBOX_NAME}"]`)
    .filter((check) => check.checked)
    .map((check) => check.value);

function confirmDelete() {
  const repos = getSelectedRepoNames();
  if (repos.length === 0) {
    return alert('Please select repo first');
  }

  if (
    !confirm('Are you sure to delete the selected repos: ' + repos.join(', '))
  ) {
    // User cancelled the deletion, do nothing.
    return;
  }

  // Send the delete message to background.js to execute the deletion.
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

// Insert a checkbox before each repository link.
function insertCheckBeforeRepoNames() {
  const REPOSITORY_LINK_SELECTOR = 'a[itemprop="name codeRepository"]';

  $$(REPOSITORY_LINK_SELECTOR).forEach((repoLink) => {
    // Check if checkbox already exists for this repo
    const existingCheckbox = repoLink.parentNode.querySelector(
      `input[name="${CHECKBOX_NAME}"]`
    );
    if (existingCheckbox) {
      return;
    }

    // If not, insert a checkbox before the repository link.
    const repoName = repoLink.innerText.trim();
    repoLink.parentNode.insertAdjacentHTML(
      'afterbegin',
      `<input type="checkbox" name="${CHECKBOX_NAME}" value="${repoName}">`
    );
  });
}

// TODO: the delete button could be replaced by the action button.
function insertDeleteButton() {
  if (getDeleteButton()) {
    console.log('The delete button exists, exit');
    return;
  }

  // Add the delete button to the repository page.
  const deleteButton = document.createElement('button');
  deleteButton.id = DELETE_BUTTON_ID;
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
  $('main').insertAdjacentElement('beforeend', deleteButton);
}

// Initialize the repository page DOM updates to show batch delete UI.
// This function should be called when entering the repository page.
function init() {
  if (isGithubRepository(location.href)) {
    insertCheckBeforeRepoNames();
    insertDeleteButton();
  }
}

// Deinitialize to remove the batch delete UI.
// This function should be called when leaving the repository page.
function deInit() {
  // Remove the delete button.
  const deleteButton = getDeleteButton();
  if (deleteButton) {
    deleteButton.remove();
  }
}

// Listen for message from background.js, this is the entry point of the content script.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'init') {
    // console.log('init the delete button');
    init();
  } else if (request.type === 'deInit') {
    // console.log('hide the delete button');
    deInit();
  } else if (request.type === 'delete') {
    console.log(`Delete all repos:\n ${request.payload.repos.join('\n')}`);
  }

  // Send an empty response
  // See https://github.com/mozilla/webextension-polyfill/issues/130#issuecomment-531531890
  sendResponse({});
  return true;
});
