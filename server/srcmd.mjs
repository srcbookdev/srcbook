import { marked } from 'marked';
import { randomid } from './utils.mjs';

marked.use({ gfm: true });

export function encode(cells) {
  const encoded = cells
    .map((cell) => {
      switch (cell.type) {
        case 'title':
          return `# ${cell.text}`;
        case 'markdown':
          return cell.text.trim();
        case 'package.json':
          return [`###### package.json\n`, `\`\`\`json`, cell.source, '```'].join('\n');
        case 'code':
          return [`###### ${cell.filename}\n`, `\`\`\`${cell.language}`, cell.source, '```'].join(
            '\n',
          );
      }
    })
    .join('\n\n');

  // End every file with exactly one newline.
  return encoded + '\n';
}

export function decode(contents) {
  // First, decode the markdown text into tokens.
  const tokens = marked.lexer(contents);

  // Second, group tokens by their function:
  //
  //     1. title
  //     2. markdown
  //     3. filename
  //     4. package.json (this is a special case of filename)
  //     5. code
  //
  const groups = groupTokens(tokens);

  // Third, validate the token groups and return a list of errors.
  // Example errors might be:
  //
  //     1. The document contains no title
  //     2. There is a filename (h6) with no corresponding code block
  //     3. There is more than one package.json defined
  //     4. etc.
  //
  const errors = validateTokenGroups(groups);

  // Finally, return either the set of errors or the tokens converted to cells if no errors were found.
  return errors.length > 0
    ? { error: true, errors: errors }
    : { error: false, cells: convertToCells(groups) };
}

/**
 * Group tokens into an intermediate representation.
 */
export function groupTokens(tokens) {
  const grouped = [];

  function push(token, type) {
    const group = grouped[grouped.length - 1];
    if (group && group.type === type) {
      group.tokens.push(token);
    } else {
      grouped.push({ type: type, tokens: [token] });
    }
  }

  function lastGroupType() {
    const lastGroup = grouped[grouped.length - 1];
    return lastGroup ? lastGroup.type : null;
  }

  function isPackageJsonFilename(token) {
    return token.type === 'heading' && token.depth === 6 && token.text === 'package.json';
  }

  let i = 0;
  const len = tokens.length;

  while (i < len) {
    const token = tokens[i];

    if (token.type === 'heading') {
      if (token.depth === 1) {
        grouped.push({ type: 'title', token: token });
      } else if (token.depth === 6) {
        const type = isPackageJsonFilename(token) ? 'package.json:heading' : 'filename';
        grouped.push({ type: type, token: token });
      } else {
        push(token, 'markdown');
      }
    } else if (token.type === 'code') {
      if (lastGroupType() === 'filename') {
        grouped.push({ type: 'code', token: token });
      } else if (lastGroupType() === 'package.json:heading') {
        grouped.push({ type: 'package.json', token: token });
      } else {
        push(token, 'markdown');
      }
    } else {
      push(token, 'markdown');
    }

    i += 1;
  }

  // Consider moving the package.json group to the first or second element if it exists.
  return grouped;
}

function validateTokenGroups(grouped) {
  const errors = [];

  const firstGroupIsTitle = grouped[0].type === 'title';
  const hasOnlyOneTitle = grouped.filter((group) => group.type === 'title').length === 1;
  const invalidTitle = !(firstGroupIsTitle && hasOnlyOneTitle);
  const hasAtMostOnePackageJson =
    grouped.filter((group) => group.type === 'package.json').length <= 1;

  if (invalidTitle) {
    errors.push('Document must contain exactly one h1 heading');
  }

  if (!hasAtMostOnePackageJson) {
    errors.push('Document must contain at most one package.json');
  }

  let i = 0;
  const len = grouped.length;

  while (i < len) {
    const group = grouped[i];

    if (group.type === 'filename') {
      if (grouped[i + 1].type !== 'code') {
        const raw = group.token.raw.trimEnd();
        errors.push(`h6 is reserved for code cells, but no code block followed '${raw}'`);
      } else {
        i += 1;
      }
    }

    i += 1;
  }

  return errors;
}

function convertToCells(groups) {
  const len = groups.length;
  const cells = [];

  let i = 0;

  while (i < len) {
    const group = groups[i];

    if (group.type === 'title') {
      cells.push(convertTitle(group.token));
    } else if (group.type === 'markdown') {
      const hasNonSpaceTokens = group.tokens.some((token) => token.type !== 'space');
      // This shouldn't happen under most conditions, but if the file was edited or created manually, then there
      // could be cases where there is excess whitespace, causing markdown blocks that were not intentional. Thus,
      // we only create markdown cells when the markdown contains more than just space tokens.
      if (hasNonSpaceTokens) {
        cells.push(convertMarkdown(group.tokens));
      }
    } else if (group.type === 'package.json') {
      // Note that we purposefully skip the package.json:heading group.
      cells.push(convertPackageJson(group.token));
    } else if (group.type === 'filename') {
      i += 1;
      const codeToken = groups[i].token;
      const filename = group.token.text;
      cells.push(convertCode(codeToken, filename));
    }

    i += 1;
  }

  return cells;
}

function convertTitle(token) {
  return {
    id: randomid(),
    type: 'title',
    text: token.text,
  };
}

function convertPackageJson(token) {
  return {
    id: randomid(),
    type: 'package.json',
    source: token.text,
  };
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

function convertMarkdown(tokens) {
  return {
    id: randomid(),
    type: 'markdown',
    text: serializeMarkdownTokens(tokens),
  };
}

function serializeMarkdownTokens(tokens) {
  return tokens
    .map((token) => {
      const md = token.raw;
      return token.type === 'code' ? md : md.replace(/\n{3,}/g, '\n\n');
    })
    .join('');
}

export function newContents(basename) {
  return `# ${basename}

###### package.json
\`\`\`json
{
  "name": ${basename},
  "version": "0.0.1",
  "description": "",
  "main": "index.mjs",
  "dependencies": {}
}
\`\`\`
`;
}
