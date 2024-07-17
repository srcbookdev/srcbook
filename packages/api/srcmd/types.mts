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

export type DecodeResult = DecodeErrorResult | DecodeSuccessResult;
