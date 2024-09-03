import type { TitleCellType, TitleCellUpdateAttrsType } from '@srcbook/shared';
import { EditableH1 } from '../ui/heading';
import { useCells } from '../use-cell';

export default function TitleCell(props: {
  cell: TitleCellType;
  updateCellOnServer: (cell: TitleCellType, attrs: TitleCellUpdateAttrsType) => void;
}) {
  const { cell, updateCellOnServer } = props;
  const { updateCell: updateCellOnClient } = useCells();

  function updateCell(text: string) {
    updateCellOnClient({ ...cell, text });
    updateCellOnServer(cell, { text });
  }

  return (
    <div className="mb-4" id={`cell-${cell.id}`}>
      <EditableH1 className="title" onUpdated={updateCell} text={cell.text} />
    </div>
  );
}
