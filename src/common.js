export const isGithubRepository = (url) =>
  url.includes('github.com') && url.includes('tab=repositories');
