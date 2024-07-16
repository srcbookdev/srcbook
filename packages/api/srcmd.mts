import { marked } from 'marked';
import fs from 'node:fs/promises';
import { randomid } from '@srcbook/shared';
import type { Tokens, Token, TokensList } from 'marked';
import type { CellType, CodeCellType, JsonType, MarkdownCellType } from '@srcbook/shared';
import { languageFromFilename } from '@srcbook/shared';
import { pathToCodeFile, pathToPackageJson, pathToReadme } from './srcbook/path.mjs';
import type { SessionType } from './types.mjs';

marked.use({ gfm: true });

export function encode(session: SessionType, options: { inline: boolean }) {
  const encodedCells = session.cells.map((cell) => {
    return cell.type === 'markdown' ? encodeMarkdownCell(cell) : encodeCodeCell(cell, options);
  });

  const encoded = [
    `<!-- srcbook:${JSON.stringify({ language: session.language })} -->`,
    `# ${session.title}`,
    encodeCollapsibleJsonFile('package.json', session['package.json'], options),
  ];

  if (session.language === 'typescript') {
    encoded.push(encodeCollapsibleJsonFile('package.json', session['package.json'], options));
  }

  // End every file with exactly one newline.
  return encoded.concat(encodedCells).join('\n\n').trimEnd() + '\n';
}

function encodeCollapsibleJsonFile(
  file: string,
  language: string,
  source: string,
  options: { inline: boolean },
) {
  const fileContents = options.inline
    ? `\`\`\`${language}\n${source}\n\`\`\``
    : `[${file}](./${file})`;
  return `<details>\n  <summary>${file}</summary>\n\n${fileContents}\n</details>`;
}

export function encodeMarkdownCell(cell: MarkdownCellType) {
  return cell.text.trim();
}

export function encodeCodeCell(cell: CodeCellType, options: { inline: boolean }) {
  const source = options.inline
    ? [`###### ${cell.filename}\n`, `\`\`\`${cell.language}`, cell.source, '```']
    : [
        `###### ${cell.filename}\n`,
        `[${cell.filename}](./src/${cell.filename}})`, // note we don't use Path.join here because this is for the markdown file.
      ];

  return source.join('\n');
}

export type DecodeErrorResult = {
  error: true;
  errors: string[];
};

export type DecodeSuccessResult = {
  error: false;
  cells: CellType[];
  metadata: SrcbookMetadataType;
};

export type DecodeResult = DecodeErrorResult | DecodeSuccessResult;

export function decode(contents: string): DecodeResult {
  // First, decode the markdown text into tokens.
  const tokens = marked.lexer(contents);

  // Second, pluck out srcbook metadata (ie <!-- srcbook:{<json>} -->):
  const { metadata, tokens: filteredTokens } = getSrcbookMetadata(tokens);

  // Third, group tokens by their function:
  //
  //     1. title
  //     2. markdown
  //     3. filename
  //     4. code
  //
  const groups = groupTokens(filteredTokens);

  // Fourth, validate the token groups and return a list of errors.
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
    : { error: false, metadata, cells: convertToCells(groups) };
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
    const readmePath = pathToReadme(dir);
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
        const filePath =
          cell.type === 'package.json'
            ? pathToPackageJson(dir)
            : pathToCodeFile(dir, cell.filename);

        pendingFileReads.push(
          fs.readFile(filePath, 'utf-8').then((source) => {
            cell.source = source;
          }),
        );
      }
    }

    // Wait for all file reads to complete
    await Promise.all(pendingFileReads);

    return { error: false, metadata: readmeResult.metadata, cells };
  } catch (e) {
    const error = e as unknown as Error;
    return { error: true, errors: [error.message] };
  }
}

const SRCBOOK_METADATA_RE = /^<!--\s*srcbook:(.+)\s*-->$/;

function getSrcbookMetadata(tokens: TokensList) {
  let match: RegExpMatchArray | null = null;
  let srcbookMetdataToken: Token | null = null;

  for (const token of tokens) {
    if (token.type !== 'html') {
      continue;
    }

    match = token.raw.trim().match(SRCBOOK_METADATA_RE);

    if (match) {
      srcbookMetdataToken = token;
      break;
    }
  }

  if (!match) {
    throw new Error('Srcbook does not contain required metadata');
  }

  try {
    const metadata = JSON.parse(match[1]);
    return {
      metadata: SrcbookMetadataSchema.parse(metadata),
      tokens: tokens.filter((t) => t !== srcbookMetdataToken),
    };
  } catch (e) {
    throw new Error(`Unable to parse srcbook metadata: ${(e as Error).message}`);
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

function convertToCells(groups: GroupedTokensType[]): CellType[] {
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
    status: 'idle',
  };
}

function convertCode(token: Tokens.Code, filename: string): CodeCellType {
  return {
    id: randomid(),
    type: 'code',
    source: token.text,
    language: languageFromFilename(filename),
    filename: filename,
    status: 'idle',
  };
}

// Convert a linked code token to the right cell: either a package.json file or a code cell.
// We assume that the link is in the format [filename](filePath).
// We don't populate the source field here, as we will read the file contents later.
function convertLinkedCode(token: Tokens.Link): CodeCellType | PackageJsonCellType {
  return token.text === 'package.json'
    ? {
        id: randomid(),
        type: 'package.json',
        source: '',
        filename: 'package.json',
        status: 'idle',
      }
    : {
        id: randomid(),
        type: 'code',
        source: '',
        language: languageFromFilename(token.text),
        filename: token.text,
        status: 'idle',
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
