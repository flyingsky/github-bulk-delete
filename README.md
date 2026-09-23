# <img src="public/icons/icon_48.png" width="45" align="left"> Bulk Delete for GitHub

Bulk Delete for GitHub

**NOTE** I don't expect this extension get more 1k installs and 4 star ratings based on 13 ratings. The more important thing is this extension gets the Microsoft's trademark bot notice, so it requests Google Chrome to take it down. It's my great honor! So I have rename it from "Github Bulk Delete" to "Bulk Delete for GitHub" based on Gemini Flash 3.8 suggestion. Hope it works!

## Features

The GitHub only supports delete repository one by one. This chrome extension could support bulk delete.

After install this extension, sign in your account, then go to your repository list page, such as https://github.com/flyingsky?tab=repositories.

This extension will add a checkbox to each repository and a "Delete" button on the repository page. Select multiple repos, then click the Delete button to start the deletion automatically.

**NOTE**: Actually this extension could be replaced by [GitHub CLI](https://cli.github.com/) (`gh`) and its `gh repo delete` command. See more details from below section.

## Design

- The `contentScript.js` builds the UI on the repository page, including the checkbox next to each repository name, select all checkbox and delete button.
- The `background.js` manipulate the tab to simulate the human beings's actions to delete repository one by one.

## Contribution

Suggestions and pull requests are welcomed! To start the dev follow below steps:

- `npm install -g chrome-extension-cli` if you don't install it before.
- `cd github-bulk-delete`
- `npm install` if it's your first time to initial this project
- `npm run watch` watch your change in local
- `npm test` run unit tests
- Load the extension into the Chrome.
  - Open chrome://extensions
  - Check the Developer mode checkbox
  - Click on the Load unpacked extension button
  - Select the folder auto generated folder `build`
- Bundle the app into static files for Chrome store by `npm run repack` and you can find the out put in the release folder.

## Github CLI

Install [GitHub CLI](https://cli.github.com/) (`gh`) via below commands:

```bash
# macOS
brew install gh

# Windows (winget)
winget install --id GitHub.cli

# Linux
# See distro-specific instructions: https://github.com/cli/cli/blob/trunk/docs/install_linux.md
```

Then authenticate, granting the `delete_repo` scope up front so batch deletion works without a re-prompt:

```bash
gh auth login
gh auth refresh -h github.com -s delete_repo
```

Verify it's ready:

```bash
gh auth status
```

Delete repositories in batch by running following commands in terminal.

```bash
# Define the target repos to be deleted
repos=(repo1 repo2 repo3)

# Delete repos one by one without any confirmation, replace the <YOUR_GITHUB_ACCOUNT> with your github account name.
# For example my github account is flyingsky.
for r in "${repos[@]}"; do gh repo delete <YOUR_GITHUB_ACCOUNT>/$r --yes; done
```

To test this extension, you can use gh CLI to create multiple repositories like below.

```bash
# Define the target repos to be created
repos=(repo1 repo2 repo3)

# Create repos one by one without any confirmation, replace the <YOUR_GITHUB_ACCOUNT> with your github account name
# For example my github account is flyingsky.
for r in "${repos[@]}"; do gh repo create <YOUR_GITHUB_ACCOUNT>/$r --yes; done
```
