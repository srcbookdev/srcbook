import * as Diff from 'diff';

export function diffFiles(file1: string, file2: string): { additions: number; deletions: number } {
  const changes: Diff.Change[] = Diff.diffLines(file1, file2);
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
