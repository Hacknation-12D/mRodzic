/**
 * Tokeny motywu DaisyUI w JS (bez importów RN – używane też w testach Node).
 * Źródłem prawdy jest src/global.css; test palette.test.ts pilnuje zgodności.
 * W komponentach używaj klas (bg-primary, text-base-content…). Ta paleta służy tam,
 * gdzie potrzebny jest surowy kolor: ikony, nawigacja, kolory dzieci, Markdown.
 */
export type ThemeColors = {
  base100: string;
  base200: string;
  base300: string;
  baseContent: string;
  baseContentMuted: string;
  primary: string;
  primaryContent: string;
  primarySoft: string;
  primarySoftContent: string;
  secondary: string;
  secondaryContent: string;
  accent: string;
  accentContent: string;
  neutral: string;
  neutralContent: string;
  neutralSoft: string;
  info: string;
  infoContent: string;
  infoSoft: string;
  success: string;
  successContent: string;
  successSoft: string;
  warning: string;
  warningContent: string;
  warningSoft: string;
  error: string;
  errorContent: string;
  errorSoft: string;
  overlay: string;
};

const primaryColor = '#007834';
const accentColor = '#283754';

export const lightColors: ThemeColors = {
  base100: '#ffffff',
  base200: '#f7f4ef',
  base300: '#ddd5cb',
  baseContent: '#1f1b16',
  baseContentMuted: '#5e564c',
  primary: primaryColor,
  primaryContent: '#ffffff',
  primarySoft: '#dceae4',
  primarySoftContent: primaryColor,
  secondary: '#dceae4',
  secondaryContent: primaryColor,
  accent: accentColor,
  accentContent: '#ffffff',
  neutral: '#3b3732',
  neutralContent: '#f2ede6',
  neutralSoft: '#ece7e0',
  info: accentColor,
  infoContent: '#ffffff',
  infoSoft: '#dce7f7',
  success: '#1e6b3a',
  successContent: '#ffffff',
  successSoft: '#d6f0dd',
  warning: '#8a5300',
  warningContent: '#ffffff',
  warningSoft: '#fce8c8',
  error: '#b3261e',
  errorContent: '#ffffff',
  errorSoft: '#f9dedc',
  overlay: 'rgba(0, 0, 0, 0.4)',
};

export const darkColors: ThemeColors = {
  base100: '#1f1d1a',
  base200: '#141311',
  base300: '#3b3732',
  baseContent: '#f2ede6',
  baseContentMuted: '#b5ada2',
  primary: primaryColor,
  primaryContent: '#0e1f19',
  primarySoft: '#23392f',
  primarySoftContent: primaryColor,
  secondary: '#23392f',
  secondaryContent: primaryColor,
  accent: accentColor,
  accentContent: '#0e1f19',
  neutral: '#e7e0d6',
  neutralContent: '#1f1b16',
  neutralSoft: '#2e2b27',
  info: accentColor,
  infoContent: '#0e1f19',
  infoSoft: '#1e2e45',
  success: '#9ad8ab',
  successContent: '#0e1f19',
  successSoft: '#1d3a26',
  warning: '#f5c27a',
  warningContent: '#1f1b16',
  warningSoft: '#43321a',
  error: '#f2b8b5',
  errorContent: '#1f1b16',
  errorSoft: '#4a1f1c',
  overlay: 'rgba(0, 0, 0, 0.6)',
};
