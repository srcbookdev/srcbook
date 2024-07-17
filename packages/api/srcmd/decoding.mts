import { marked } from 'marked';
import type { Tokens, Token, TokensList } from 'marked';
import { SrcbookMetadataSchema, randomid } from '@srcbook/shared';
import type {
  CellType,
  CodeCellType,
  MarkdownCellType,
  PackageJsonCellType,
  TitleCellType,
} from '@srcbook/shared';
import { languageFromFilename } from '@srcbook/shared';
import type { DecodeResult } from './types.mjs';

marked.use({ gfm: true });

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

const SRCBOOK_METADATA_RE = /^<!--\s*srcbook:(.+)\s*-->$/;
const DETAILS_OPEN_RE = /<details[^>]*>/;
const DETAILS_CLOSE_RE = /<\/details>/;
const SUMMARY_RE = /<summary>(.+)<\/summary>/;

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
  value: string;
};

type CodeGroupType = {
  type: 'code';
  token: Tokens.Code;
};

type ExternalCodeGroupType = {
  type: 'code:external';
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
  | ExternalCodeGroupType;

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

  let i = 0;
  const len = tokens.length;

  while (i < len) {
    const token = tokens[i];

    switch (token.type) {
      case 'heading':
        if (token.depth === 1) {
          grouped.push({ type: 'title', token: token as Tokens.Heading });
        } else {
          pushMarkdownToken(token);
        }
        i += 1;
        break;
      case 'html':
        if (DETAILS_OPEN_RE.test(token.raw)) {
          i = parseDetails(tokens, i, grouped);
        } else {
          pushMarkdownToken(token);
          i += 1;
        }
        break;
      default:
        pushMarkdownToken(token);
        i += 1;
    }
  }

  // Consider moving the package.json group to the first or second element if it exists.
  return grouped;
}

function parseDetails(tokens: Token[], i: number, grouped: GroupedTokensType[]) {
  const token = tokens[i];

  if (token.type !== 'html') {
    throw new Error('Expected token to be of type html');
  }

  const match = token.raw.match(SUMMARY_RE);

  // TODO: Skip and treat as user markdown if no summary is found?
  if (!match) {
    throw new Error('Expected <details> HTML to contain a <summary> tag');
  }

  grouped.push({ type: 'filename', value: match[1] });

  i += 1;

  i = advancePastWhitespace(tokens, i);

  const nextToken = tokens[i];

  if (nextToken.type === 'paragraph') {
    const link = (nextToken.tokens ?? []).find((t) => t.type === 'link') as Tokens.Link;
    grouped.push({ type: 'code:external', token: link });
  } else if (nextToken.type === 'code') {
    const code = nextToken as Tokens.Code;
    grouped.push({ type: 'code', token: code });
  }

  i += 1;

  i = advancePastWhitespace(tokens, i);

  const closingTag = tokens[i];

  if (closingTag.type !== 'html' || !DETAILS_CLOSE_RE.test(closingTag.raw)) {
    throw new Error('Expected closing </details> tag');
  }

  i += 1;

  return i;
}

function advancePastWhitespace(tokens: Token[], i: number) {
  while (i < tokens.length && tokens[i].type === 'space') {
    i += 1;
  }
  return i;
}

function validateTokenGroups(grouped: GroupedTokensType[]) {
  const errors: string[] = [];

  const firstGroupIsTitle = grouped[0].type === 'title';
  const hasOnlyOneTitle = grouped.filter((group) => group.type === 'title').length === 1;
  const invalidTitle = !(firstGroupIsTitle && hasOnlyOneTitle);
  const hasOnePackageJson =
    grouped.filter((g) => g.type === 'filename' && g.value === 'package.json').length === 1;

  if (invalidTitle) {
    errors.push('Document must contain exactly one h1 heading');
  }

  if (!hasOnePackageJson) {
    errors.push('Document must contain exactly one package.json');
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
          const filename = group.value;
          const cell =
            filename === 'package.json'
              ? convertPackageJson(codeToken)
              : convertCode(codeToken, filename);
          cells.push(cell);
          break;
        }
        case 'code:external': {
          const linkToken = (groups[i] as ExternalCodeGroupType).token;
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
