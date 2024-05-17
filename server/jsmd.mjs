import { marked } from 'marked';
import { randomid } from './utils.mjs';

marked.use({ gfm: true });

export function encode(cells) {
  console.log('encoding cells', cells);
  return cells
    .map((cell) => {
      switch (cell.type) {
        case 'title':
          return `# ${cell.text}`;
        case 'markdown':
          // Since we have the markdown, use it. But we could also recursively encode .tokens
          return cell.rawText;
        case 'code':
          return ['```' + cell.language, `// ${cell.filename}`, cell.source, '```'].join('\n');
      }
    })
    .join('\n\n');
}

export function decode(contents) {
  const tokens = marked.lexer(contents);
  return convertToCells(tokens);
}

function convertToCells(tokens) {
  console.log('tokens:', tokens);
  const cells = tokens.reduce(
    ({ result, currentMarkdown }, token) => {
      switch (token.type) {
        case 'heading':
          if (token.depth === 1) {
            result.push({ id: randomid(), type: 'title', text: token.text });
          } else {
            currentMarkdown.push(token);
          }
          return { result, currentMarkdown };
        case 'code':
          result.push({ id: randomid(), type: 'markdown', tokens: currentMarkdown });
          currentMarkdown = [];
          result.push(convertCode(token));
          return { result, currentMarkdown };
        case 'space':
          currentMarkdown.push(token);
          return { result, currentMarkdown };
        default:
          currentMarkdown.push(token);
          return { result, currentMarkdown };
      }
    },
    { result: [], currentMarkdown: [] },
  );
  console.log('cells:');
  console.dir(cells, { depth: null });
  let finalCells = cells.result.concat({
    id: randomid(),
    type: 'markdown',
    tokens: cells.currentMarkdown,
  });
  finalCells = finalCells.map((cell) => {
    if (cell.type === 'markdown') {
      cell.rawText = cell.tokens.reduce((acc, token) => {
        return acc + token.raw;
      }, '');
      return cell;
    }
    return cell;
  });
  console.log('finalCells:');
  console.dir(finalCells, { depth: null });

  return finalCells;
}

function convertCode(token) {
  const [filename, source] = parseSource(token.text);

  return {
    id: randomid(),
    stale: false,
    type: 'code',
    source: source,
    module: null,
    context: null,
    language: token.lang,
    filename: filename,
    output: [],
  };
}

function parseSource(source) {
  const [line, ...rest] = source.split('\n');
  return [line.replace(/\/\/\s*/, ''), rest.join('\n')];
}
