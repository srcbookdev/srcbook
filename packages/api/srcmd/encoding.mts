import { marked } from 'marked';
import type {
  CellType,
  CodeCellType,
  MarkdownCellType,
  PackageJsonCellType,
  TitleCellType,
  SrcbookMetadataType,
} from '@srcbook/shared';

marked.use({ gfm: true });

export function encode(
  allCells: CellType[],
  metadata: SrcbookMetadataType,
  options: { inline: boolean },
) {
  const [firstCell, secondCell, ...remainingCells] = allCells;
  const titleCell = firstCell as TitleCellType;
  const packageJsonCell = secondCell as PackageJsonCellType;
  const cells = remainingCells as (MarkdownCellType | CodeCellType)[];

  const encoded = [
    `<!-- srcbook:${JSON.stringify(metadata)} -->`,
    encodeTitleCell(titleCell),
    encodePackageJsonCell(packageJsonCell, options),
    ...cells.map((cell) => {
      switch (cell.type) {
        case 'markdown':
          return encodeMarkdownCell(cell);
        case 'code':
          return encodeCodeCell(cell, options);
      }
    }),
  ];

  // End every file with exactly one newline.
  return encoded.join('\n\n').trimEnd() + '\n';
}

function encodeTitleCell(cell: TitleCellType) {
  return `# ${cell.text}`;
}

function encodeMarkdownCell(cell: MarkdownCellType) {
  return cell.text.trim();
}

function encodePackageJsonCell(cell: PackageJsonCellType, options: { inline: boolean }) {
  return options.inline
    ? encodeCollapsibleFileInline({
        open: false,
        filename: 'package.json',
        language: 'json',
        source: cell.source,
      })
    : encodeCollapsibleFileExternal({
        open: false,
        filename: 'package.json',
        filepath: './package.json',
      });
}

function encodeCodeCell(cell: CodeCellType, options: { inline: boolean }) {
  return options.inline
    ? encodeCollapsibleFileInline({
        open: true,
        filename: cell.filename,
        language: cell.language,
        source: cell.source,
      })
    : encodeCollapsibleFileExternal({
        open: true,
        filename: cell.filename,
        filepath: `./src/${cell.filename}`,
      });
}

function encodeCollapsibleFileInline(options: {
  open: boolean;
  source: string;
  filename: string;
  language: string;
}) {
  // Markdown code block containing the file's source.
  const detailsBody = `\`\`\`${options.language}\n${options.source}\n\`\`\``;
  return encodeCollapsibleFile(detailsBody, options.filename, options.open);
}

function encodeCollapsibleFileExternal(options: {
  open: boolean;
  filename: string;
  filepath: string;
}) {
  // Markdown link linking to external file.
  const detailsBody = `[${options.filename}](${options.filepath})`;
  return encodeCollapsibleFile(detailsBody, options.filename, options.open);
}

function encodeCollapsibleFile(fileContents: string, filename: string, open: boolean) {
  // The HTML <details> element is rendered as a collapsible section in GitHub UI.
  //
  // - https://gist.github.com/scmx/eca72d44afee0113ceb0349dd54a84a2
  // - https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/organizing-information-with-collapsed-sections
  //
  // The <summary> element is the header of the collapsible section, which we use to display the filename.
  // The <details> element is collapsed by default, but can be expanded by adding the 'open' attribute.
  return `<details${open ? ' open' : ''}>\n  <summary>${filename}</summary>\n\n${fileContents}\n</details>`;
}
