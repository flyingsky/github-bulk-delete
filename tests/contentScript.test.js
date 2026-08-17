describe('contentScript.js', () => {
  let runtimeOnMessageListener;
  let sendMessageMock;

  beforeEach(() => {
    jest.resetModules();

    // In jsdom, HTMLElement.innerText is not fully implemented by default
    Object.defineProperty(HTMLElement.prototype, 'innerText', {
      get() {
        return this.textContent || '';
      },
      set(val) {
        this.textContent = val;
      },
      configurable: true,
    });

    // Set up standard GitHub repositories DOM structure
    document.body.innerHTML = `
      <div class="Layout-main">
        <ul>
          <li>
            <h3>
              <a href="/flyingsky/repo-1" itemprop="name codeRepository">repo-1</a>
            </h3>
          </li>
          <li>
            <h3>
              <a href="/flyingsky/repo-2" itemprop="name codeRepository">repo-2</a>
            </h3>
          </li>
        </ul>
      </div>
    `;

    // Mock window.location
    delete window.location;
    window.location = new URL('https://github.com/flyingsky?tab=repositories');

    sendMessageMock = jest.fn((message, callback) => {
      if (callback) callback('success');
    });

    global.chrome = {
      runtime: {
        sendMessage: sendMessageMock,
        onMessage: {
          addListener: jest.fn((listener) => {
            runtimeOnMessageListener = listener;
          }),
        },
      },
    };

    // Mock window.alert and window.confirm
    window.alert = jest.fn();
    window.confirm = jest.fn().mockReturnValue(true);

    require('../src/contentScript');
  });

  afterEach(() => {
    delete global.chrome;
    document.body.innerHTML = '';
  });

  test('registers onMessage listener', () => {
    expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
    expect(typeof runtimeOnMessageListener).toBe('function');
  });

  test('initializes UI elements on init message', async () => {
    const sendResponse = jest.fn();
    runtimeOnMessageListener({ type: 'init' }, {}, sendResponse);

    // Allow promise/waitForRepositoryListDOMReady to resolve
    await new Promise((r) => setTimeout(r, 50));

    const checkboxes = document.querySelectorAll(
      'input[name="gbd_target_repo"]'
    );
    expect(checkboxes.length).toBe(2);
    expect(checkboxes[0].value).toBe('repo-1');
    expect(checkboxes[1].value).toBe('repo-2');

    const actionsContainer = document.querySelector('#gbd_actions_container');
    expect(actionsContainer).not.toBeNull();

    const selectAll = document.querySelector('#gbd_select_all_repos');
    expect(selectAll).not.toBeNull();

    const deleteBtn = document.querySelector('#gbd_delete');
    expect(deleteBtn).not.toBeNull();
  });

  test('selectAll toggles all repository checkboxes', async () => {
    runtimeOnMessageListener({ type: 'init' }, {}, jest.fn());
    await new Promise((r) => setTimeout(r, 50));

    const selectAll = document.querySelector('#gbd_select_all_repos');
    const checkboxes = document.querySelectorAll(
      'input[name="gbd_target_repo"]'
    );

    // Click select all (toggles to checked)
    selectAll.click();
    expect(selectAll.checked).toBe(true);
    checkboxes.forEach((cb) => expect(cb.checked).toBe(true));

    // Click select all again (toggles to unchecked)
    selectAll.click();
    expect(selectAll.checked).toBe(false);
    checkboxes.forEach((cb) => expect(cb.checked).toBe(false));
  });

  test('confirmDelete alerts when no repositories are selected', async () => {
    runtimeOnMessageListener({ type: 'init' }, {}, jest.fn());
    await new Promise((r) => setTimeout(r, 50));

    const deleteBtn = document.querySelector('#gbd_delete');
    deleteBtn.click();

    expect(window.alert).toHaveBeenCalledWith('Please select repo first');
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
  });

  test('confirmDelete sends delete message when repos are selected and user confirms', async () => {
    runtimeOnMessageListener({ type: 'init' }, {}, jest.fn());
    await new Promise((r) => setTimeout(r, 50));

    const checkboxes = document.querySelectorAll(
      'input[name="gbd_target_repo"]'
    );
    checkboxes[0].checked = true;

    const deleteBtn = document.querySelector('#gbd_delete');
    deleteBtn.click();

    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining('repo-1')
    );
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      {
        type: 'delete',
        payload: {
          repos: ['repo-1'],
          account: 'flyingsky',
        },
      },
      expect.any(Function)
    );
  });

  test('confirmDelete does not send delete message when user cancels confirm prompt', async () => {
    window.confirm.mockReturnValueOnce(false);

    runtimeOnMessageListener({ type: 'init' }, {}, jest.fn());
    await new Promise((r) => setTimeout(r, 50));

    const checkboxes = document.querySelectorAll(
      'input[name="gbd_target_repo"]'
    );
    checkboxes[0].checked = true;

    const deleteBtn = document.querySelector('#gbd_delete');
    deleteBtn.click();

    expect(window.confirm).toHaveBeenCalled();
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
  });

  test('removes UI on deInit message', async () => {
    runtimeOnMessageListener({ type: 'init' }, {}, jest.fn());
    await new Promise((r) => setTimeout(r, 50));

    expect(document.querySelector('#gbd_actions_container')).not.toBeNull();

    runtimeOnMessageListener({ type: 'deInit' }, {}, jest.fn());
    expect(document.querySelector('#gbd_actions_container')).toBeNull();
  });
});
