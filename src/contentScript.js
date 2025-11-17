'use strict';

// Content script file will run in the context of web page.
// With content script you can manipulate the web pages using
// Document Object Model (DOM).
// You can also pass information to the parent extension.

// We execute this script by making an entry in manifest.json file
// under `content_scripts` property

const PREFIX = 'gbd';
const CHECKBOX_NAME = `${PREFIX}_target_repo`;
const SELECT_ALL_CHECKBOX_ID = `${PREFIX}_select_all_repos`;
const DELETE_BUTTON_ID = `${PREFIX}_delete`;
const ACTIONS_CONTAINER_ID = `${PREFIX}_actions_container`;

const GITHUB_REPOSITORY_LIST_SELECTOR = '.Layout-main';
const GITHUB_REPOSITORY_LINK_SELECTOR = 'a[itemprop="name codeRepository"]';

const $ = document.querySelector.bind(document);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

// location like `https://github.com/flyingsky?tab=repositories`
const getGithubAcountId = () => location.pathname.split('/').find(Boolean);

const getSelectAllCheckbox = () => $(`#${SELECT_ALL_CHECKBOX_ID}`);

const getActionsContainer = () => $(`#${ACTIONS_CONTAINER_ID}`);

const getRepositoryList = () =>
  $$(GITHUB_REPOSITORY_LINK_SELECTOR).map((repoLink) =>
    repoLink.innerText.trim()
  );

const getSelectedRepoNames = () =>
  $$(`input[name="${CHECKBOX_NAME}"]`)
    .filter((check) => check.checked)
    .map((check) => check.value);

// The previous repository list, which is used to detect the repository list DOM update.
let previousRepoList = [];

// Detect if GitHub is in dark mode or light mode by checking the actual background color.
const isDarkModeTheme = () => {
  const element = document.body || document.documentElement;
  const bgColor = window.getComputedStyle(element).backgroundColor;

  // Extract RGB values from the background color
  const rgb = bgColor.match(/\d+/g);
  if (!rgb || rgb.length < 3) {
    return false; // Default to light mode if we can't detect
  }

  // Calculate relative luminance using the formula
  const [r, g, b] = rgb.map(Number);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // If luminance is less than 0.5, it's a dark background
  return luminance < 0.5;
};

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
  $$(GITHUB_REPOSITORY_LINK_SELECTOR).forEach((repoLink) => {
    // Check if checkbox already exists for this repo
    const existingCheckbox = repoLink.parentNode.querySelector(
      `input[name="${CHECKBOX_NAME}"]`
    );
    if (existingCheckbox) {
      console.log(
        `Checkbox already exists for repo: ${repoLink.innerText.trim()}`
      );
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

// Inject CSS styles for the batch delete UI.
const injectStyles = () => {
  if ($(`#${PREFIX}_styles`)) {
    return; // Styles already injected
  }

  const isDarkMode = isDarkModeTheme();
  const style = document.createElement('style');
  style.id = `${PREFIX}_styles`;
  style.textContent = `
    #${ACTIONS_CONTAINER_ID} {
      position: sticky;
      bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 15px;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      margin: 0 20%;
      z-index: 1000;
      background-color: ${
        isDarkMode ? 'rgba(27, 31, 36, 0.6)' : 'rgba(255, 255, 255, 0.6)'
      };
      border: 1px solid ${
        isDarkMode ? 'rgba(240, 246, 252, 0.1)' : 'rgba(27, 31, 36, 0.15)'
      };
    }

    .${PREFIX}_select_all_wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    #${SELECT_ALL_CHECKBOX_ID} {
      cursor: pointer;
      width: 16px;
      height: 16px;
    }

    label[for="${SELECT_ALL_CHECKBOX_ID}"] {
      color: ${isDarkMode ? '#c9d1d9' : '#24292f'};
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      user-select: none;
    }

    #${DELETE_BUTTON_ID} {
      padding: 8px 16px;
      background-color: #da3633;
      color: #ffffff;
      border: 1px solid rgba(240, 246, 252, 0.1);
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    #${DELETE_BUTTON_ID}:hover {
      background-color: #b62324;
    }
  `;
  document.head.appendChild(style);
};

// Build the select all checkbox with its wrapper and label.
const buildSelectAllCheckbox = () => {
  // Create a wrapper for the select all checkbox and label.
  const selectAllWrapper = document.createElement('div');
  selectAllWrapper.className = `${PREFIX}_select_all_wrapper`;

  // Add a checkbox to select all repos checkboxes.
  const selectAllCheckbox = document.createElement('input');
  selectAllCheckbox.type = 'checkbox';
  selectAllCheckbox.id = SELECT_ALL_CHECKBOX_ID;
  // TODO: If any repo checkbox is unchecked, the select all checkbox should be unchecked.
  selectAllCheckbox.addEventListener('click', selectAllRepos);
  selectAllWrapper.appendChild(selectAllCheckbox);

  // Add label for the select all checkbox.
  const selectAllLabel = document.createElement('label');
  selectAllLabel.htmlFor = SELECT_ALL_CHECKBOX_ID;
  selectAllLabel.innerText = 'Select all';
  selectAllWrapper.appendChild(selectAllLabel);

  return selectAllWrapper;
};

// Build the delete button.
const buildDeleteButton = () => {
  const deleteButton = document.createElement('button');
  deleteButton.id = DELETE_BUTTON_ID;
  deleteButton.innerText = 'Delete Repositories';
  deleteButton.addEventListener('click', confirmDelete);
  return deleteButton;
};

// Delete the actions container.
function deleteActionsContainer() {
  const actionsContainer = getActionsContainer();
  if (actionsContainer) {
    actionsContainer.remove();
  }
}

// TODO: the delete button could be replaced by the action button.
function insertActionsContainer() {
  deleteActionsContainer();

  // Inject CSS styles
  injectStyles();

  // Create a container for all batch delete UI elements.
  const container = document.createElement('div');
  container.id = ACTIONS_CONTAINER_ID;
  container.appendChild(buildSelectAllCheckbox());
  container.appendChild(buildDeleteButton());
  // Append the container to the page.
  $(GITHUB_REPOSITORY_LIST_SELECTOR).insertAdjacentElement(
    'beforeend',
    container
  );
}

// Select/deselect all repos checkboxes when select/deselect the SELECT_ALL_CHECKBOX_ID checkbox.
function selectAllRepos() {
  const selectAllCheckbox = getSelectAllCheckbox();
  const repoCheckboxes = $$(`input[name="${CHECKBOX_NAME}"]`);
  repoCheckboxes.forEach((checkbox) => {
    checkbox.checked = selectAllCheckbox.checked;
  });
}

function isRepositoryListUpdated() {
  // If the repository lists are changed, we consider it as updated.
  const currentRepoList = getRepositoryList();
  if (currentRepoList.length !== previousRepoList.length) {
    return true;
  }

  for (let i = 0; i < currentRepoList.length; i++) {
    if (currentRepoList[i] !== previousRepoList[i]) {
      return true;
    }
  }
  return false;
}

// Wait for the repository list DOM is updated.
function waitForRepositoryListDOMReady() {
  return new Promise((resolve, reject) => {
    // The timeout id used to clear the timeout callback when the mutation observer detects the repository list update.
    let timeoutId;

    // Case 1: If repository list is already updated, resolve immediately
    if (isRepositoryListUpdated()) {
      return resolve('DOM update is detected immediately');
    }

    // Case 2: Watch for the DOM update by mutation observer.
    const observer = new MutationObserver((mutations, obs) => {
      if (isRepositoryListUpdated()) {
        // Stop the mutation observer to avoid it's called again for any changes.
        obs.disconnect();
        // Clear the timeout to avoid it's called after the mutation observer detects the repository list update.
        clearTimeout(timeoutId);
        return resolve('DOM update is detected by mutation observer');
      }
    });

    observer.observe($(GITHUB_REPOSITORY_LIST_SELECTOR), {
      childList: true,
      subtree: true,
    });

    // Case 3: Timeout after 2 seconds to catch the DOM update as fallback, which should not happen.
    // The promise is only resolved once, so either the mutation observer or the timeout will resolve the promise.
    timeoutId = setTimeout(() => {
      console.log('Repository list update is not detected but trigger timeout');

      // Stop the mutation observer.
      observer.disconnect();

      // If the repository list is updated, resolve the promise.
      isRepositoryListUpdated()
        ? resolve('DOM update is detected by timeout')
        : reject('DOM update is not detected by timeout');
    }, 2000);
  });
}

// Initialize the repository page DOM updates to show batch delete UI.
// This function should be called when entering the repository page.
async function init() {
  try {
    // The `init` message is sent when the resources are ready, but the DOM may not be updated yet.
    // Especially when we change the repository page, the DOM may not be updated yet.
    // So we need to wait for the DOM to be updated.
    await waitForRepositoryListDOMReady();

    // Update the batch delete UI.
    previousRepoList = getRepositoryList();
    insertCheckBeforeRepoNames();
    insertActionsContainer();
  } catch (error) {
    console.error(`Cannot detect repository list update, error: ${error}`);
  }
}

// Deinitialize to remove the batch delete UI.
// This function should be called when leaving the repository page.
function deInit() {
  // Remove the container (which contains all UI elements).
  deleteActionsContainer();
  previousRepoList = [];
}

// TODO: move all other UI related code into a separate file.
//
// Listen for message from background.js, this is the entry point of the content script.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'init') {
    init();
  } else if (request.type === 'deInit') {
    deInit();
  } else if (request.type === 'delete') {
    console.log(`Deleted repos:\n ${request.payload.repos.join('\n')}`);
  }

  // Send an empty response
  // See https://github.com/mozilla/webextension-polyfill/issues/130#issuecomment-531531890
  sendResponse({});
  return true;
});
