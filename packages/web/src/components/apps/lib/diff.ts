import * as Diff from 'diff';

export function diffFiles(
  original: string,
  modified: string,
): { additions: number; deletions: number } {
  const changes: Diff.Change[] = Diff.diffLines(original, modified);

  let additions: number = 0;
  let deletions: number = 0;

  changes.forEach((part: Diff.Change) => {
    if (part.added) {
      additions += part.count ?? 0;
    } else if (part.removed) {
      deletions += part.count ?? 0;
    }
  });

  return { additions, deletions };
}

type AddedType = 1;
type RemovedType = -1;
type UnChangedType = 0;
type ChangeType = AddedType | RemovedType | UnChangedType;

export function calculateSquares(
  additions: number,
  deletions: number,
  maxSquares: number = 5,
): ChangeType[] {
  const result: ChangeType[] = [0, 0, 0, 0, 0];

  const totalChanges = additions + deletions;

  if (totalChanges === 0) {
    return result;
  }

  // Calculate the proportion of added and removed lines
  const addedProportion = additions / totalChanges;

  // Calculate the number of squares for added, ensuring at least 1 if there are any additions
  let addedSquares = Math.round(addedProportion * maxSquares);
  addedSquares = additions > 0 ? Math.max(1, addedSquares) : 0;

  // Calculate removed squares, ensuring at least 1 if there are any removals
  let removedSquares = maxSquares - addedSquares;
  removedSquares = deletions > 0 ? Math.max(1, removedSquares) : 0;

  // Final adjustment to ensure we don't exceed maxSquares
  if (addedSquares + removedSquares > maxSquares) {
    if (additions > deletions) {
      removedSquares = maxSquares - addedSquares;
    } else {
      addedSquares = maxSquares - removedSquares;
    }
  }

  for (let i = 0; i < addedSquares; i++) {
    result[i] = 1;
  }

  for (let i = addedSquares; i < maxSquares; i++) {
    result[i] = -1;
  }

  return result;
}
