type Appearance = "light" | "dark";

export function AppearanceToggle({
  initialAppearance,
  locale,
  storageKey,
}: {
  readonly initialAppearance: Appearance;
  readonly locale: string;
  readonly storageKey: string;
}) {
  const isArabic = locale === "ar";
  const darkLabel = isArabic ? "تفعيل الوضع الداكن" : "Switch to dark mode";
  const lightLabel = isArabic ? "تفعيل الوضع الفاتح" : "Switch to light mode";
  const darkText = isArabic ? "داكن" : "Dark";
  const lightText = isArabic ? "فاتح" : "Light";
  const initialIsDark = initialAppearance === "dark";
  const script = `(() => {
    const root = document.querySelector('.siteRoot');
    const button = document.querySelector('[data-appearance-toggle]');
    if (!root || !button) return;
    const key = ${JSON.stringify(storageKey)};
    const setAppearance = (value) => {
      const appearance = value === 'dark' ? 'dark' : 'light';
      const isDark = appearance === 'dark';
      root.setAttribute('data-color-scheme', appearance);
      button.setAttribute('aria-label', isDark ? button.dataset.lightLabel : button.dataset.darkLabel);
      button.setAttribute('title', isDark ? button.dataset.lightLabel : button.dataset.darkLabel);
      button.querySelector('[data-appearance-icon]').textContent = isDark ? '☀' : '☾';
      button.querySelector('[data-appearance-text]').textContent = isDark ? button.dataset.lightText : button.dataset.darkText;
      try { window.localStorage.setItem(key, appearance); } catch {}
    };
    try {
      const saved = window.localStorage.getItem(key);
      if (saved === 'dark' || saved === 'light') setAppearance(saved);
    } catch {}
    button.addEventListener('click', () => {
      setAppearance(root.getAttribute('data-color-scheme') === 'dark' ? 'light' : 'dark');
    });
  })();`;

  return (
    <>
      <button
        aria-label={initialIsDark ? lightLabel : darkLabel}
        className="appearanceToggle"
        data-appearance-toggle
        data-dark-label={darkLabel}
        data-dark-text={darkText}
        data-light-label={lightLabel}
        data-light-text={lightText}
        title={initialIsDark ? lightLabel : darkLabel}
        type="button"
      >
        <span aria-hidden data-appearance-icon>
          {initialIsDark ? "☀" : "☾"}
        </span>
        <span data-appearance-text>{initialIsDark ? lightText : darkText}</span>
      </button>
      <script dangerouslySetInnerHTML={{ __html: script }} />
    </>
  );
}
