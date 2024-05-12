import { marked } from 'marked';
import { randomid } from './utils.mjs';

marked.use({ gfm: true });

export function encode(cells) {
  return cells
    .map((cell) => {
      switch (cell.type) {
        case 'heading':
          return '#'.repeat(cell.depth) + ' ' + cell.text;
        case 'code':
          return ['```' + cell.language, `// ${cell.filename}`, cell.source, '```'].join('\n');
      }
    })
    .join('\n\n');
}

export function decode(contents) {
  const tokens = marked.lexer(contents);
  return convertToCell(tokens);
}

function convertToCell(tokens) {
  return tokens.reduce((result, token) => {
    switch (token.type) {
      case 'heading':
        result.push(convertHeading(token));
        return result;
      case 'code':
        result.push(convertCode(token));
        return result;
      case 'space':
        return result;
      default:
        throw new Error(`No converter implemented for type ${token.type}`);
    }
  }, []);
}

function convertHeading(token) {
  return {
    id: randomid(),
    stale: false,
    type: 'heading',
    text: token.text,
    depth: token.depth,
    output: [],
  };
}

function convertCode(token) {
  const [filename, source] = parseSource(token.text);

  return {
    id: randomid(),
    stale: false,
    type: 'code',
    source: source,
    language: token.lang,
    filename: filename,
    output: [],
  };
}

function parseSource(source) {
  const [line, ...rest] = source.split('\n');
  return [line.replace(/\/\/\s*/, ''), rest.join('\n')];
}
