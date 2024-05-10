import fs from 'fs/promises';
import Path from 'path';
import { marked } from 'marked';
import { randomid } from './utils.mjs';

marked.use({ gfm: true });

export async function read(path) {
  if (Path.extname(path) !== '.jsmd') {
    throw new Error(`path argument must be to a .jsmd file but got ${path}`);
  }

  const contents = await fs.readFile(path, { encoding: 'utf8' });

  return parse(contents);
}

export function parse(contents) {
  const tokens = marked.lexer(contents);
  return convert(tokens);
}

function convert(tokens) {
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
    type: 'heading',
    text: token.text,
    depth: token.depth,
    output: [],
  };
}

function convertCode(token) {
  return {
    id: randomid(),
    type: 'code',
    source: token.text,
    language: token.lang,
    output: [],
  };
}
