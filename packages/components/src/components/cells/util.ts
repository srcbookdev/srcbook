export function mapTsServerLocationToCM(code: string, line: number, offset: number): number {
  const lines = code.split('\n');
  const startOffset =
    lines.slice(0, line - 1).reduce((sum, line) => sum + line.length + 1, 0) + offset - 1;
  return Math.min(code.length - 1, startOffset);
}

export function mapCMLocationToTsServer(
  code: string,
  cmPosition: number,
): { line: number; offset: number } {
  const lines = code.split('\n');
  let remainingPosition = cmPosition;
  let lineIndex = 0;

  while (lineIndex < lines.length && remainingPosition > (lines[lineIndex]?.length ?? 0)) {
    remainingPosition -= (lines[lineIndex]?.length ?? 0) + 1; // +1 for newline character
    lineIndex++;
  }

  return {
    line: lineIndex + 1,
    offset: remainingPosition,
  };
}
