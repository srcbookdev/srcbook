import { TitleCellType, TitleCellUpdateAttrsType } from '@srcbook/shared';
import { EditableH1 } from '../ui/heading';

export default function TitleCell(props: {
  cell: TitleCellType;
  onUpdateCell: (
    cell: TitleCellType,
    attrs: TitleCellUpdateAttrsType,
    getValidationError?: (cell: TitleCellType) => string | null,
  ) => Promise<string | null>;
}) {
  return (
    <div id={`cell-${props.cell.id}`} className="mb-4">
      <EditableH1
        text={props.cell.text}
        className="title"
        onUpdated={(text) => props.onUpdateCell(props.cell, { text })}
      />
    </div>
  );
}
