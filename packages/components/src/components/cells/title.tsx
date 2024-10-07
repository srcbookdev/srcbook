import { TitleCellType, TitleCellUpdateAttrsType } from '@srcbook/shared';
import { EditableH1 } from '../ui/heading.js';

type BaseProps = {
  cell: TitleCellType;
};
type RegularProps = BaseProps & {
  readOnly?: false;
  updateCellOnClient: (cell: TitleCellType) => void;
  updateCellOnServer: (cell: TitleCellType, attrs: TitleCellUpdateAttrsType) => void;
};
type ReadOnlyProps = BaseProps & { readOnly: true };

export default function TitleCell(props: RegularProps | ReadOnlyProps) {
  function updateCell(text: string) {
    if (props.readOnly) {
      return;
    }
    props.updateCellOnClient({ ...props.cell, text });
    props.updateCellOnServer(props.cell, { text });
  }

  return (
    <div id={`cell-${props.cell.id}`} className="mb-4">
      {props.readOnly ? (
        <h1 className="title">{props.cell.text}</h1>
      ) : (
        <EditableH1 text={props.cell.text} className="title" onUpdated={updateCell} />
      )}
    </div>
  );
}
