import { marked } from 'marked';
import { randomid } from './utils.mjs';

marked.use({ gfm: true });

export function encode(cells) {
  return cells
    .map((cell) => {
      switch (cell.type) {
        case 'title':
          return `# ${cell.text}`;
        case 'markdown':
          // Since we have the raw text, use it. But we could also recursively encode .tokens
          return cell.text.trim();
        case 'code':
          return [`#### ${cell.filename}`, `\`\`\`${cell.language}`, cell.source, '```'].join('\n');
      }
    })
    .join('\n\n');
}

export function decode(contents) {
  const tokens = marked.lexer(contents);
  return convertToCells(tokens);
}

const nextNonSpaceNode = (tokens, index) => {
  index++;
  while (tokens[index] && tokens[index].type === 'space') {
    index++;
  }
  return index;
};

function convertToCells(tokens) {
  const result = [];
  let currentMarkdown = [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    switch (token.type) {
      case 'heading':
        if (token.depth === 1) {
          result.push({ id: randomid(), type: 'title', text: token.text });
        } else if (token.depth === 4) {
          const nextNoneSpaceIndex = nextNonSpaceNode(tokens, i);
          if (tokens[nextNoneSpaceIndex] && tokens[nextNoneSpaceIndex].type === 'code') {
            // we are in a supported executable code block
            const codeToken = tokens[nextNoneSpaceIndex];

            // Push the previous mardkown if necessary
            if (currentMarkdown.length > 0) {
              result.push({ id: randomid(), type: 'markdown', tokens: currentMarkdown });
              currentMarkdown = [];
            }

            result.push(convertCode(codeToken, token.text));
            i = nextNoneSpaceIndex;
            break;
          }
        } else {
          currentMarkdown.push(token);
        }
        break;

      default:
        currentMarkdown.push(token);
        break;
    }

    i++;
  }

  let finalCells = result;
  // Flush the last markdown if we have any left over.
  if (currentMarkdown.length !== 0) {
    finalCells = result.concat({
      id: randomid(),
      type: 'markdown',
      tokens: currentMarkdown,
    });
  }

  // Reduce the markdown tokens to a single cell text value
  return finalCells.map((cell) => {
    if (cell.type === 'markdown') {
      cell.text = cell.tokens.reduce((acc, token) => {
        return acc + token.raw;
      }, '');
      return cell;
    }
    return cell;
  });
}

function convertCode(token, filename) {
  return {
    id: randomid(),
    stale: false,
    type: 'code',
    source: token.text,
    module: null,
    context: null,
    language: token.lang,
    filename: filename,
    output: [],
  };
}
