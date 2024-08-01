import type { SessionType } from '../types.mjs';

export type SrcbookType = Pick<SessionType, 'cells' | 'language' | 'tsconfig.json'>;

export type DecodeErrorResult = {
  error: true;
  errors: string[];
};

export type DecodeSuccessResult = {
  error: false;
  srcbook: SrcbookType;
};

export type DecodeCellsSuccessResult = {
  error: false;
  srcbook: Pick<SessionType, 'cells'>;
};

// This represents the result of decoding a complete .src.md file.
export type DecodeResult = DecodeErrorResult | DecodeSuccessResult;

// This represents the result of decoding a subset of content from a .src.md file.
export type DecodeCellsResult = DecodeErrorResult | DecodeCellsSuccessResult;
