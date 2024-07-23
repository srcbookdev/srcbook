import { TitleCellType, TitleCellUpdateAttrsType } from '@srcbook/shared';
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
    <div id={`cell-${cell.id}`} className="mb-4">
      <EditableH1 text={cell.text} className="title" onUpdated={updateCell} />
    </div>
  );
}
