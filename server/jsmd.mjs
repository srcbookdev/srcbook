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
          return ['```' + cell.language, cell.source, '```'].join('\n');
      }
    })
    .join('\n\n');
}

export function decode(contents) {
  const tokens = marked.lexer(contents);
  return convertToCell(tokens);
}

function convertToCell(tokens) {
  return tokens.map((token) => {
    switch (token.type) {
      case 'heading':
        return convertHeading(token);
      case 'code':
        return convertCode(token);
      default:
        throw new Error(`No converter implemented for type ${token.type}`);
    }
  });
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
  return {
    id: randomid(),
    stale: false,
    type: 'code',
    source: token.text,
    language: token.lang,
    output: [],
  };
}
