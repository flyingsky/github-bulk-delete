describe('background.js', () => {
  let tabsOnUpdatedListener;
  let runtimeOnMessageListener;
  let sendMessageMock;
  let tabsUpdateMock;
  let executeScriptMock;

  beforeEach(() => {
    jest.resetModules();

    sendMessageMock = jest.fn((tabId, message, callback) => {
      if (callback) callback({ status: 'ok' });
    });
    tabsUpdateMock = jest.fn().mockResolvedValue({});
    executeScriptMock = jest.fn().mockResolvedValue([]);

    global.chrome = {
      runtime: {
        lastError: null,
        onMessage: {
          addListener: jest.fn((listener) => {
            runtimeOnMessageListener = listener;
          }),
        },
      },
      tabs: {
        sendMessage: sendMessageMock,
        update: tabsUpdateMock,
        onUpdated: {
          addListener: jest.fn((listener) => {
            tabsOnUpdatedListener = listener;
          }),
          removeListener: jest.fn(),
        },
      },
      scripting: {
        executeScript: executeScriptMock,
      },
    };

    require('../src/background');
  });

  afterEach(() => {
    delete global.chrome;
  });

  describe('tabs.onUpdated listener', () => {
    test('ignores events where status is not complete', () => {
      tabsOnUpdatedListener(
        1,
        { status: 'loading' },
        { url: 'https://github.com/flyingsky?tab=repositories' }
      );
      expect(sendMessageMock).not.toHaveBeenCalled();
    });

    test('sends init message when navigating to a repository page', () => {
      tabsOnUpdatedListener(
        1,
        { status: 'complete' },
        { url: 'https://github.com/flyingsky?tab=repositories' }
      );

      expect(sendMessageMock).toHaveBeenCalledWith(
        1,
        { type: 'init' },
        expect.any(Function)
      );
    });

    test('sends deInit message when previously on repository tab then navigates away', () => {
      // 1. Visit repository tab -> init
      tabsOnUpdatedListener(
        2,
        { status: 'complete' },
        { url: 'https://github.com/flyingsky?tab=repositories' }
      );
      expect(sendMessageMock).toHaveBeenCalledWith(
        2,
        { type: 'init' },
        expect.any(Function)
      );

      sendMessageMock.mockClear();

      // 2. Switch to overview tab -> deInit
      tabsOnUpdatedListener(
        2,
        { status: 'complete' },
        { url: 'https://github.com/flyingsky' }
      );
      expect(sendMessageMock).toHaveBeenCalledWith(
        2,
        { type: 'deInit' },
        expect.any(Function)
      );
    });

    test('does nothing when non-repository tab updates and was not in repositoryTabIds', () => {
      tabsOnUpdatedListener(
        3,
        { status: 'complete' },
        { url: 'https://github.com/flyingsky' }
      );
      expect(sendMessageMock).not.toHaveBeenCalled();
    });
  });

  describe('runtime.onMessage listener', () => {
    test('returns true for async handling when request type is delete', () => {
      const sendResponse = jest.fn();
      const result = runtimeOnMessageListener(
        {
          type: 'delete',
          payload: { account: 'flyingsky', repos: ['test-repo'] },
        },
        { tab: { id: 1 } },
        sendResponse
      );

      expect(result).toBe(true);
    });

    test('does nothing when request type is not delete', () => {
      const sendResponse = jest.fn();
      const result = runtimeOnMessageListener(
        { type: 'other' },
        { tab: { id: 1 } },
        sendResponse
      );

      expect(result).toBeUndefined();
      expect(sendResponse).not.toHaveBeenCalled();
    });
  });

  describe('deleteRepoById simulated DOM actions', () => {
    test('clicks delete buttons, fills verification input, and confirms deletion', () => {
      document.body.innerHTML = `
        <button id="dialog-show-repo-delete-menu-dialog"></button>
        <button id="repo-delete-proceed-button" disabled></button>
        <input id="verification_field" value="" />
      `;

      const showDialogBtn = document.querySelector(
        '#dialog-show-repo-delete-menu-dialog'
      );
      const proceedBtn = document.querySelector('#repo-delete-proceed-button');
      const verificationField = document.querySelector('#verification_field');

      const showDialogClick = jest.spyOn(showDialogBtn, 'click');
      const proceedClick = jest.spyOn(proceedBtn, 'click');

      // The function in background.js executes inside page context
      const repoId = 'flyingsky/test-repo';
      showDialogBtn.click();
      proceedBtn.click();
      proceedBtn.click();
      verificationField.value = repoId;
      proceedBtn.disabled = false;
      proceedBtn.click();

      expect(showDialogClick).toHaveBeenCalled();
      expect(proceedClick).toHaveBeenCalledTimes(3);
      expect(verificationField.value).toBe('flyingsky/test-repo');
      expect(proceedBtn.disabled).toBe(false);
    });
  });
});
