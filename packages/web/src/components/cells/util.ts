export function mapTsServerLocationToCM(code: string, line: number, offset: number): number {
  return Math.min(
    code.length - 1,
    code
      .split('\n')
      .slice(0, line - 1)
      .join('\n').length + offset,
  );
}

export function mapCMLocationToTsServer(
  code: string,
  cmPosition: number,
): { line: number; offset: number } {
  const lines = code.split('\n');
  let remainingPosition = cmPosition;
  let lineIndex = 0;

  while (lineIndex < lines.length && remainingPosition > lines[lineIndex].length) {
    remainingPosition -= lines[lineIndex].length + 1; // +1 for newline character
    lineIndex++;
  }

  return {
    line: lineIndex + 1,
    offset: remainingPosition,
  };
}
