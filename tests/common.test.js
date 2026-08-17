import { isGithubRepository } from '../src/common';

describe('isGithubRepository', () => {
  test('returns true for user repositories tab URL', () => {
    expect(
      isGithubRepository('https://github.com/flyingsky?tab=repositories')
    ).toBe(true);
  });

  test('returns true when query params include page and tab=repositories', () => {
    expect(
      isGithubRepository('https://github.com/flyingsky?page=2&tab=repositories')
    ).toBe(true);
  });

  test('returns true when tab=repositories is among other params', () => {
    expect(
      isGithubRepository(
        'https://github.com/flyingsky?tab=repositories&q=test&type=public'
      )
    ).toBe(true);
  });

  test('returns false for user profile overview page', () => {
    expect(isGithubRepository('https://github.com/flyingsky')).toBe(false);
  });

  test('returns false for specific repo URL', () => {
    expect(
      isGithubRepository('https://github.com/flyingsky/github-bulk-delete')
    ).toBe(false);
  });

  test('returns false for non-github URLs with tab=repositories', () => {
    expect(isGithubRepository('https://gitlab.com/test?tab=repositories')).toBe(
      false
    );
  });

  test('returns false for non-repositories tab on github', () => {
    expect(
      isGithubRepository('https://github.com/flyingsky?tab=projects')
    ).toBe(false);
  });
});
