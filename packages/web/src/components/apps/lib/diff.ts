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
  const totalChanges = additions + deletions;

  if (totalChanges === 0) {
    return Array(maxSquares).fill(0);
  }

  if (totalChanges <= maxSquares) {
    return createSquares(additions, deletions, maxSquares);
  }

  // Calculate the proportion of added and removed lines
  const addedProportion = additions / totalChanges;

  // Calculate the number of squares for added, ensuring at least 1 if there are any additions
  let addedSquares = Math.round(addedProportion * maxSquares);
  addedSquares = additions > 0 ? Math.max(1, addedSquares) : 0;

  // Calculate removed squares, ensuring at least 1 if there are any removals
  let deletedSquares = maxSquares - addedSquares;
  deletedSquares = deletions > 0 ? Math.max(1, deletedSquares) : 0;

  // Final adjustment to ensure we don't exceed maxSquares
  if (addedSquares + deletedSquares > maxSquares) {
    if (additions > deletions) {
      deletedSquares = maxSquares - addedSquares;
    } else {
      addedSquares = maxSquares - deletedSquares;
    }
  }

  return createSquares(addedSquares, deletedSquares, maxSquares);
}

function createSquares(added: number, deleted: number, max: number): ChangeType[] {
  if (added + deleted > max) {
    console.error(`Expected max ${max} squares but got ${added + deleted}`);
  }

  const result: ChangeType[] = [];

  for (let i = 0; i < added; i++) {
    result.push(1);
  }

  for (let i = 0; i < deleted; i++) {
    result.push(-1);
  }

  // If there's remaining space, fill with 'unchanged'
  for (let i = 0, len = max - result.length; i < len; i++) {
    result.push(0);
  }

  return result;
}
