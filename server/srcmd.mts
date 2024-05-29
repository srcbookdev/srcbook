import { marked } from 'marked';
import Path from 'path';
import fs from 'node:fs/promises';
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

export function encode(cells: CellType[], options: { inline: boolean }) {
  const encoded = cells
    .map((cell) => {
      switch (cell.type) {
        case 'title':
          return encodeTitleCell(cell);
        case 'markdown':
          return encodeMarkdownCell(cell);
        case 'package.json':
          return encodePackageJsonCell(cell, options);
        case 'code':
          return encodeCodeCell(cell, options);
      }
    })
    .join('\n\n');

  // End every file with exactly one newline.
  return encoded.trimEnd() + '\n';
}

export function encodeTitleCell(cell: TitleCellType) {
  return `# ${cell.text}`;
}

export function encodeMarkdownCell(cell: MarkdownCellType) {
  return cell.text.trim();
}

export function encodePackageJsonCell(cell: PackageJsonCellType, options: { inline: boolean }) {
  const source = options.inline
    ? ['###### package.json\n', '```json', cell.source.trim(), '```']
    : ['###### package.json\n', '[package.json](./package.json)'];

  return source.join('\n');
}

export function encodeCodeCell(cell: CodeCellType, options: { inline: boolean }) {
  const source = options.inline
    ? [`###### ${cell.filename}\n`, `\`\`\`${cell.language}`, cell.source, '```']
    : [`###### ${cell.filename}\n`, `[${cell.filename}](./${cell.filename})`];

  return source.join('\n');
}

export type DecodeErrorResult = {
  error: true;
  errors: string[];
};

export type DecodeSuccessResult = {
  error: false;
  cells: CellType[];
};

export type DecodeResult = DecodeErrorResult | DecodeSuccessResult;

export function decode(contents: string): DecodeResult {
  // First, decode the markdown text into tokens.
  const tokens = marked.lexer(contents);

  // Second, group tokens by their function:
  //
  //     1. title
  //     2. markdown
  //     3. filename
  //     4. code
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
 * Decode a compatible directory into a set of cells.
 *
 * The directory must contain a README.md file and a package.json file.
 * We assume the README.md file contains the srcbook content, in particular
 * the first 2 cells should be a title cell and then a package.json.cell
 *
 * We leverage the decode() function first to decode the README.md file, and then
 * we replace the contents of the referenced package.json and code files into the cells.
 */
export async function decodeDir(dir: string): Promise<DecodeResult> {
  try {
    const readmePath = Path.join(dir, 'README.md');
    const readmeContents = await fs.readFile(readmePath, 'utf-8');
    // Decode the README.md file into cells.
    // The code blocks and the package.json will only contain the filename at this point,
    // the actual source for each file will be read from the file system in the next step.
    const readmeResult = decode(readmeContents);

    if (readmeResult.error) {
      return readmeResult;
    }

    const cells = readmeResult.cells;
    const pendingFileReads: Promise<void>[] = [];

    // Let's replace all the code cells with the actual file contents for each one
    for (const cell of cells) {
      if (cell.type === 'code' || cell.type === 'package.json') {
        const filePath = Path.join(dir, cell.filename);
        pendingFileReads.push(
          fs.readFile(filePath, 'utf-8').then((source) => {
            cell.source = source;
          }),
        );
      }
    }

    // Wait for all file reads to complete
    await Promise.all(pendingFileReads);

    return { error: false, cells };
  } catch (e) {
    const error = e as unknown as Error;
    return { error: true, errors: [error.message] };
  }
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

type LinkedCodeGroupType = {
  type: 'code:linked';
  token: Tokens.Link;
};

type MarkdownGroupType = {
  type: 'markdown';
  tokens: Token[];
};

type GroupedTokensType =
  | TitleGroupType
  | FilenameGroupType
  | CodeGroupType
  | MarkdownGroupType
  | LinkedCodeGroupType;

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

  function isLink(token: Tokens.Paragraph) {
    return token.tokens.length === 1 && token.tokens[0].type === 'link';
  }

  let i = 0;
  const len = tokens.length;

  while (i < len) {
    const token = tokens[i];

    switch (token.type) {
      case 'heading':
        if (token.depth === 1) {
          grouped.push({ type: 'title', token: token as Tokens.Heading });
        } else if (token.depth === 6) {
          grouped.push({ type: 'filename', token: token as Tokens.Heading });
        } else {
          pushMarkdownToken(token);
        }
        break;
      case 'code':
        if (lastGroupType() === 'filename') {
          grouped.push({ type: 'code', token: token as Tokens.Code });
        } else {
          pushMarkdownToken(token);
        }
        break;
      case 'paragraph':
        if (lastGroupType() === 'filename' && token.tokens && isLink(token as Tokens.Paragraph)) {
          const link = token.tokens[0] as Tokens.Link;
          grouped.push({ type: 'code:linked', token: link });
        } else {
          pushMarkdownToken(token);
        }
        break;
      default:
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
      if (!['code', 'code:linked'].includes(grouped[i + 1].type)) {
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

function langFromFilename(filename: string): string {
  const ext = Path.extname(filename);
  switch (ext) {
    case '.js':
    case '.mjs':
      return 'javascript';
    case '.ts':
    case '.mts':
      return 'typescript';
    case '.json':
      return 'json';
    default:
      throw new Error(`Unknown file extension: ${ext}`);
  }
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
      switch (groups[i].type) {
        case 'code': {
          const codeToken = (groups[i] as CodeGroupType).token;
          const filename = group.token.text;
          const cell =
            filename === 'package.json'
              ? convertPackageJson(codeToken)
              : convertCode(codeToken, filename);
          cells.push(cell);
          break;
        }
        case 'code:linked': {
          const linkToken = (groups[i] as LinkedCodeGroupType).token;
          const cell = convertLinkedCode(linkToken);
          cells.push(cell);
          break;
        }
        default:
          throw new Error('Unexpected token type after a heading 6.');
      }
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
    filename: 'package.json',
    output: [],
  };
}

function convertCode(token: Tokens.Code, filename: string): CodeCellType {
  return {
    id: randomid(),
    type: 'code',
    source: token.text,
    language: token.lang || 'javascript',
    filename: filename,
    output: [],
  };
}

// Convert a linked code token to the right cell: either a package.json file or a code cell.
// We assume that the link is in the format [filename](filePath).
// We don't populate the source field here, as we will read the file contents later.
function convertLinkedCode(token: Tokens.Link): CodeCellType | PackageJsonCellType {
  function toPkgJsonCell(): PackageJsonCellType {
    return {
      id: randomid(),
      type: 'package.json',
      source: '',
      filename: 'package.json',
      output: [],
    };
  }
  function toCodeCell(token: Tokens.Link): CodeCellType {
    return {
      id: randomid(),
      type: 'code',
      source: '',
      language: langFromFilename(token.text),
      filename: token.text,
      output: [],
    };
  }
  return token.text === 'package.json' ? toPkgJsonCell() : toCodeCell(token);
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

export function newContents(title: string) {
  return `# ${title}

###### package.json

\`\`\`json
{
  "dependencies": {}
}
\`\`\`
`;
}
