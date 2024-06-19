/**
 * @name srcbook
 */
import { tags as t } from '@lezer/highlight';
import { createTheme, CreateThemeOptions } from '@uiw/codemirror-themes';

export const defaultSettingsSrcbookLight: CreateThemeOptions['settings'] = {
  background: 'var(--backround)',
  foreground: 'var(--foreground)',
  caret: 'var(--foreground)',
  selection: '#BBDFFF',
  selectionMatch: '#BBDFFF',
  gutterBackground: 'var(--background)',
  gutterForeground: 'hsl(var(--muted-foreground))',
  gutterActiveForeground: 'hsl(var(--foreground))',
  gutterBorder: 'transparent',
  lineHighlight: 'transparent',
};

export const srcbookLightInit = (options?: Partial<CreateThemeOptions>) => {
  const { theme = 'light', settings = {}, styles = [] } = options || {};
  return createTheme({
    theme: theme,
    settings: {
      ...defaultSettingsSrcbookLight,
      ...settings,
    },
    styles: [
      { tag: [t.standard(t.tagName), t.tagName], color: '#116329' },
      { tag: [t.comment, t.bracket], color: '#6a737d' },
      { tag: [t.className, t.propertyName], color: '#6f42c1' },
      { tag: [t.variableName, t.attributeName, t.number, t.operator], color: '#005cc5' },
      { tag: [t.keyword, t.typeName, t.typeOperator, t.typeName], color: '#d73a49' },
      { tag: [t.string, t.meta, t.regexp], color: '#032f62' },
      { tag: [t.name, t.quote], color: '#22863a' },
      { tag: [t.heading, t.strong], color: '#24292e', fontWeight: 'bold' },
      { tag: [t.emphasis], color: '#24292e', fontStyle: 'italic' },
      { tag: [t.deleted], color: '#b31d28', backgroundColor: 'ffeef0' },
      { tag: [t.atom, t.bool, t.special(t.variableName)], color: '#e36209' },
      { tag: [t.url, t.escape, t.regexp, t.link], color: '#032f62' },
      { tag: t.link, textDecoration: 'underline' },
      { tag: t.strikethrough, textDecoration: 'line-through' },
      { tag: t.invalid, color: '#cb2431' },
      ...styles,
    ],
  });
};

export const srcbookLight = srcbookLightInit();

export const defaultSettingsSrcbookDark: CreateThemeOptions['settings'] = {
  background: 'var(--background)',
  foreground: 'var(--foreground)',
  caret: 'var(--foreground)',
  selection: '#003d73',
  selectionMatch: '#003d73',
  gutterBackground: 'var(--background)',
  gutterForeground: 'hsl(var(--muted-foreground))',
  lineHighlight: 'transparent',
  gutterBorder: 'transparent',
};

export const srcbookDarkInit = (options?: Partial<CreateThemeOptions>) => {
  const { theme = 'dark', settings = {}, styles = [] } = options || {};
  return createTheme({
    theme: theme,
    settings: {
      ...defaultSettingsSrcbookDark,
      ...settings,
    },
    styles: [
      { tag: [t.standard(t.tagName), t.tagName], color: '#7ee787' },
      { tag: [t.comment, t.bracket], color: '#8b949e' },
      { tag: [t.className, t.propertyName], color: '#d2a8ff' },
      { tag: [t.variableName, t.attributeName, t.number, t.operator], color: '#79c0ff' },
      { tag: [t.keyword, t.typeName, t.typeOperator, t.typeName], color: '#ff7b72' },
      { tag: [t.string, t.meta, t.regexp], color: '#a5d6ff' },
      { tag: [t.name, t.quote], color: '#7ee787' },
      { tag: [t.heading, t.strong], color: '#d2a8ff', fontWeight: 'bold' },
      { tag: [t.emphasis], color: '#d2a8ff', fontStyle: 'italic' },
      { tag: [t.deleted], color: '#ffdcd7', backgroundColor: 'ffeef0' },
      { tag: [t.atom, t.bool, t.special(t.variableName)], color: '#ffab70' },
      { tag: t.link, textDecoration: 'underline' },
      { tag: t.strikethrough, textDecoration: 'line-through' },
      { tag: t.invalid, color: '#f97583' },
      ...styles,
    ],
  });
};

export const srcbookDark = srcbookDarkInit();
