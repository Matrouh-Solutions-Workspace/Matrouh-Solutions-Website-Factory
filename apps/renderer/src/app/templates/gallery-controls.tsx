export function GalleryAppearanceToggle({ locale }: { readonly locale: "ar" | "en" }) {
  const labels =
    locale === "ar"
      ? { dark: "الوضع الداكن", light: "الوضع الفاتح" }
      : { dark: "Dark mode", light: "Light mode" };

  return (
    <button
      aria-label={labels.dark}
      className="templateGalleryThemeToggle"
      data-dark-label={labels.dark}
      data-gallery-theme-toggle
      data-light-label={labels.light}
      type="button"
    >
      <span aria-hidden data-gallery-theme-icon>
        ◐
      </span>
      <span data-gallery-theme-label>{labels.dark}</span>
    </button>
  );
}
