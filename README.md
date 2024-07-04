# <img src="public/icons/icon_48.png" width="45" align="left"> Github Bulk Delete

GitHub Bulk Delete

## Features

The GitHub only supports delete repository one by one. This chrome extension could support bulk delete.

After install this extension, sign in your account, then go to your repository list page, such as https://github.com/flyingsky?tab=repositories.

This extension will add a checkbox to each repository and a "Delete" button on the repository page. Select multiple repos, then click the Delete button to start the deletion automatically.

## Contribution

Suggestions and pull requests are welcomed! To start the dev follow below steps:

- `npm install -g chrome-extension-cli` if you don't install it before.
- Watch your change: `cd github-bulk-delete && npm run watch`.
- Load the extension into the Chrome.
  - Open chrome://extensions
  - Check the Developer mode checkbox
  - Click on the Load unpacked extension button
  - Select the folder evus-filler/build
  - Bundle the app into static files for Chrome store by `npm run build`.
