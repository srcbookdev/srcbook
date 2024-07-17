import { type CellType, type SrcbookMetadataType } from '@srcbook/shared';

export type DecodeErrorResult = {
  error: true;
  errors: string[];
};

export type DecodeSuccessResult = {
  error: false;
  cells: CellType[];
  metadata: SrcbookMetadataType;
};

// This represents the result of decoding a complete .srcmd file.
export type DecodeResult = DecodeErrorResult | DecodeSuccessResult;

// This represents the result of decoding a subset of content from a .srcmd file.
export type DecodeCellsResult = DecodeErrorResult | Omit<DecodeSuccessResult, 'metadata'>;
