import { highlightCode, tags as t, tagHighlighter } from '@lezer/highlight';
import { parser as lezerParser } from '@lezer/javascript';
import { createTheme, CreateThemeOptions } from '@uiw/codemirror-themes';

const DEFAULT_LIGHT_SETTINGS: CreateThemeOptions['settings'] = {
  background: 'var(--background)',
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

export const DEFAULT_DARK_SETTINGS: CreateThemeOptions['settings'] = {
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

export const LIGHT_TAGS = [
  { tag: [t.standard(t.tagName), t.tagName], class: 'text-[#116329]' },
  { tag: [t.comment, t.bracket], class: 'text-[#6a737d]' },
  { tag: [t.className, t.propertyName], class: 'text-[#6f42c1]' },
  { tag: [t.variableName, t.attributeName, t.number, t.operator], class: 'text-[#005cc5]' },
  { tag: [t.keyword, t.typeName, t.typeOperator, t.typeName], class: 'text-[#d73a49]' },
  { tag: [t.string, t.meta, t.regexp], class: 'text-[#032f62]' },
  { tag: [t.name, t.quote], class: 'text-[#22863a]' },
  { tag: [t.heading, t.strong], class: 'text-[#24292e] font-bold' },
  { tag: [t.emphasis], class: 'text-[#24292e] italic' },
  { tag: [t.deleted], class: 'text-[#b31d28] bg-[#ffeef0]' },
  { tag: [t.atom, t.bool, t.special(t.variableName)], class: 'text-[#e36209]' },
  { tag: [t.url, t.escape, t.regexp, t.link], class: 'text-[#032f62]' },
  { tag: t.link, class: 'underline' },
  { tag: t.strikethrough, class: 'line-through' },
  { tag: t.invalid, class: 'text-[#cb2431]' },
];
export const DARK_TAGS = [
  { tag: [t.standard(t.tagName), t.tagName], class: 'text-[#7ee787]' },
  { tag: [t.comment, t.bracket], class: 'text-[#8b949e]' },
  { tag: [t.className, t.propertyName], class: 'text-[#d2a8ff]' },
  { tag: [t.variableName, t.attributeName, t.number, t.operator], class: 'text-[#79c0ff]' },
  { tag: [t.keyword, t.typeName, t.typeOperator, t.typeName], class: 'text-[#ff7b72]' },
  { tag: [t.string, t.meta, t.regexp], class: 'text-[#a5d6ff]' },
  { tag: [t.name, t.quote], class: 'text-[#7ee787]' },
  { tag: [t.heading, t.strong], class: 'text-[#d2a8ff] font-bold' },
  { tag: [t.emphasis], class: 'text-[#d2a8ff] italic' },
  { tag: [t.deleted], class: 'text-[#ffdcd7] bg-[#ffeef0]' },
  { tag: [t.atom, t.bool, t.special(t.variableName)], class: 'text-[#ffab70]' },
  { tag: t.link, class: 'underline' },
  { tag: t.strikethrough, class: 'line-through' },
  { tag: t.invalid, class: 'text-[#f97583]' },
];

export const srcbookLight = createTheme({
  theme: 'light',
  settings: DEFAULT_LIGHT_SETTINGS,
  styles: LIGHT_TAGS,
});

export const srcbookDark = createTheme({
  theme: 'dark',
  settings: DEFAULT_DARK_SETTINGS,
  styles: DARK_TAGS,
});

function getTagHighlighter(theme: 'light' | 'dark') {
  return tagHighlighter(theme === 'light' ? LIGHT_TAGS : DARK_TAGS);
}

/**
 * Formats source code by applying syntax highlighting.
 * The result is a DOM element containing the styled tokens.
 */
export function formatCode(
  source: string,
  theme: 'light' | 'dark',
  classes: string = 'whitespace-pre-wrap',
): HTMLElement {
  const parser = lezerParser.configure({ dialect: 'ts' });
  const tree = parser.parse(source);
  const highlighter = getTagHighlighter(theme);

  const root = document.createElement('div');

  root.className = classes;

  function putText(code: string, classes: string) {
    if (classes.length === 0) {
      root.append(document.createTextNode(code));
    } else {
      const element = document.createElement('span');
      element.innerText = code;
      element.className = classes;
      root.append(element);
    }
  }

  function putBreak() {
    root.append(document.createElement('br'));
  }

  highlightCode(source, tree, highlighter, putText, putBreak);

  return root;
}
