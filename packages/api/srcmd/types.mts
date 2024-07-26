import { type CellType, type CodeLanguageType } from '@srcbook/shared';

export type DecodeErrorResult = {
  error: true;
  errors: string[];
};

export type DecodeSuccessResult = {
  error: false;
  cells: CellType[];
  language: CodeLanguageType;
};

// This represents the result of decoding a complete .src.md file.
export type DecodeResult = DecodeErrorResult | DecodeSuccessResult;

// This represents the result of decoding a subset of content from a .src.md file.
export type DecodeCellsResult = DecodeErrorResult | Omit<DecodeSuccessResult, 'language'>;
