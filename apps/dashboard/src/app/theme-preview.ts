export function applyPreviewColors(
  frame: HTMLIFrameElement | null,
  colors: Record<string, string>,
) {
  const root = frame?.contentDocument?.querySelector<HTMLElement>(".siteRoot");
  if (!root) return;
  Object.entries(colors).forEach(([key, value]) => {
    const cssKey = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    root.style.setProperty(`--theme-colors-${cssKey}`, value);
  });
  if (colors.background) root.style.setProperty("--background", colors.background);
  if (colors.text) root.style.setProperty("--text", colors.text);
  if (colors.primary) root.style.setProperty("--primary", colors.primary);
}
