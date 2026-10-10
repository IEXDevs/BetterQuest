(() => {
  const STORAGE_KEY = 'betterquest.theme';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved === 'light' || saved === 'dark'
      ? saved
      : prefersDark ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      theme === 'dark' ? '#080808' : '#f1efe9',
    );
  } catch {
    document.documentElement.dataset.theme = 'dark';
  }
})();
