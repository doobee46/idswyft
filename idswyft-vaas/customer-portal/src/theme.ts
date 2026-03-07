// idswyft-vaas/customer-portal/src/theme.ts
// Light/accessible theme — used for end-user facing verification flows
export const L = {
  bg:      '#ffffff',
  panel:   '#f8fafc',
  surface: '#f1f5f9',
  border:  '#e2e8f0',
  primary: '#0e7490',   // darker cyan for accessibility on white
  text:    '#0f172a',
  muted:   '#64748b',
  dim:     '#94a3b8',
  green:   '#15803d',
  red:     '#dc2626',
  amber:   '#d97706',
  sans:    '"DM Sans",system-ui,sans-serif',
  mono:    '"IBM Plex Mono","Fira Code",monospace',
} as const;

export type LightTokens = typeof L;

/** Inject DM Sans from Google Fonts once per page. */
export function injectFonts() {
  const id = 'idswyft-fonts';
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href =
    'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:wght@400;500;600&display=swap';
  document.head.appendChild(link);
}
