import type { CodeCellType, SessionType } from '../types';

export function validateFilename(session: SessionType, cellId: string, filename: string) {
  const validFormat = /^[a-zA-Z0-9_-]+\.(mjs|json)$/.test(filename);

  if (!validFormat) {
    return 'Invalid filename: must consist of letters, numbers, underscores, dashes and must end with mjs or json';
  }

  const codeCells = session.cells.filter((c) => c.type === 'code') as CodeCellType[];
  const unique = !codeCells.some((cell) => {
    // If a different cell with the same filename exists,
    // this is not a unique filename within the session.
    return cell.id !== cellId && cell.filename === filename;
  });

  if (!unique) {
    return 'Invalid filename: filename is not unique';
  }

  return true;
}
