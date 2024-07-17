import { marked } from 'marked';
import type { Tokens, Token, TokensList } from 'marked';
import { languageFromFilename, randomid, SrcbookMetadataSchema } from '@srcbook/shared';
import type {
  CellType,
  CodeCellType,
  MarkdownCellType,
  PackageJsonCellType,
  TitleCellType,
} from '@srcbook/shared';
import type { DecodeCellsResult, DecodeResult } from './types.mjs';

/**
 * This is used to decode a complete .src.md file.
 */
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
 * This is used to decode a subset of a .src.md file.
 *
 * For example, we generate a subset of a Srcbook (1 or more cells) using AI.
 * When that happens, we do not have the entire .src.md contents, so we need
 * to ignore some aspects of it, like parsing the metadata.
 */
export function decodeCells(contents: string): DecodeCellsResult {
  const tokens = marked.lexer(contents);
  const groups = groupTokens(tokens);
  const errors = validateTokenGroupsPartial(groups);
  return errors.length > 0
    ? { error: true, errors }
    : { error: false, cells: convertToCells(groups) };
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
function groupTokens(tokens: Token[]) {
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

  // TODO: Ensure title and package.json are the first cells.
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

function validateTokenGroupsPartial(grouped: GroupedTokensType[]) {
  const errors: string[] = [];

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
      // This shouldn't happen under most conditions, but there could be cases where there
      // is excess whitespace, causing markdown blocks that were not intentional. Thus, we
      // only create markdown cells when the markdown contains more than just space tokens.
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
    .join('')
    .trim();
}
