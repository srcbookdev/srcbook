import { marked } from 'marked';
import { randomid } from './utils.mjs';
import type { Tokens, Token } from 'marked';
import type {
  CellType,
  CodeCellType,
  MarkdownCellType,
  PackageJsonCellType,
  TitleCellType,
} from './types';

marked.use({ gfm: true });

export function encode(cells: CellType[]) {
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

export function decode(contents: string) {
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

type TitleGroupType = {
  type: 'title';
  token: Tokens.Heading;
};

type FilenameGroupType = {
  type: 'filename';
  token: Tokens.Heading;
};

type CodeGroupType = {
  type: 'code';
  token: Tokens.Code;
};

type MarkdownGroupType = {
  type: 'markdown';
  tokens: Token[];
};

type GroupedTokensType = TitleGroupType | FilenameGroupType | CodeGroupType | MarkdownGroupType;

/**
 * Group tokens into an intermediate representation.
 */
export function groupTokens(tokens: Token[]) {
  const grouped: GroupedTokensType[] = [];

  function pushMarkdownToken(token: Token) {
    const group = grouped[grouped.length - 1];
    if (group && group.type === 'markdown') {
      group.tokens.push(token);
    } else {
      grouped.push({ type: 'markdown', tokens: [token] });
    }
  }

  function lastGroupType() {
    const lastGroup = grouped[grouped.length - 1];
    return lastGroup ? lastGroup.type : null;
  }

  let i = 0;
  const len = tokens.length;

  while (i < len) {
    const token = tokens[i];

    if (token.type === 'heading') {
      if (token.depth === 1) {
        grouped.push({ type: 'title', token: token as Tokens.Heading });
      } else if (token.depth === 6) {
        grouped.push({ type: 'filename', token: token as Tokens.Heading });
      } else {
        pushMarkdownToken(token);
      }
    } else if (token.type === 'code') {
      if (lastGroupType() === 'filename') {
        grouped.push({ type: 'code', token: token as Tokens.Code });
      } else {
        pushMarkdownToken(token);
      }
    } else {
      pushMarkdownToken(token);
    }

    i += 1;
  }

  // Consider moving the package.json group to the first or second element if it exists.
  return grouped;
}

function validateTokenGroups(grouped: GroupedTokensType[]) {
  const errors: string[] = [];

  const firstGroupIsTitle = grouped[0].type === 'title';
  const hasOnlyOneTitle = grouped.filter((group) => group.type === 'title').length === 1;
  const invalidTitle = !(firstGroupIsTitle && hasOnlyOneTitle);
  const hasAtMostOnePackageJson =
    grouped.filter((group) => group.type === 'filename' && group.token.text === 'package.json')
      .length <= 1;

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

function convertToCells(groups: GroupedTokensType[]) {
  const len = groups.length;
  const cells: CellType[] = [];

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
    } else if (group.type === 'filename') {
      i += 1;
      const codeToken = (groups[i] as CodeGroupType).token;
      const filename = group.token.text;
      const cell =
        filename === 'package.json'
          ? convertPackageJson(codeToken)
          : convertCode(codeToken, filename);
      cells.push(cell);
    }

    i += 1;
  }

  return cells;
}

function convertTitle(token: Tokens.Heading): TitleCellType {
  return {
    id: randomid(),
    type: 'title',
    text: token.text,
  };
}

function convertPackageJson(token: Tokens.Code): PackageJsonCellType {
  return {
    id: randomid(),
    type: 'package.json',
    source: token.text,
  };
}

function convertCode(token: Tokens.Code, filename: string): CodeCellType {
  return {
    id: randomid(),
    stale: false,
    type: 'code',
    source: token.text,
    module: null,
    context: null,
    language: token.lang || 'javascript',
    filename: filename,
    output: [],
  };
}

function convertMarkdown(tokens: Token[]): MarkdownCellType {
  return {
    id: randomid(),
    type: 'markdown',
    text: serializeMarkdownTokens(tokens),
  };
}

function serializeMarkdownTokens(tokens: Token[]) {
  return tokens
    .map((token) => {
      const md = token.raw;
      return token.type === 'code' ? md : md.replace(/\n{3,}/g, '\n\n');
    })
    .join('');
}

export function newContents(basename: string) {
  return `# ${basename}

###### package.json

\`\`\`json
{
  "name": ${JSON.stringify(basename)},
  "version": "0.0.1",
  "description": "",
  "main": "index.mjs",
  "dependencies": {}
}
\`\`\`
`;
}
