import { useRef, useEffect } from 'react';

export default function CanvasCells({
  numCells,
  width,
  height,
}: {
  numCells: number;
  height: number;
  width: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Cap out how many cells we show... it's ugly with too many
    const shownCells = Math.min(numCells, 6);

    const spacing = Math.min(height / shownCells / 5, 4);

    let bottomPadding = 0;
    if (shownCells < numCells) {
      bottomPadding = spacing * 5;
    }
    const rectHeight = (height - bottomPadding) / (shownCells + spacing);
    const rectWidth = width;

    // Color
    const grad = ctx.createLinearGradient(0, height / 2, width, height);
    grad.addColorStop(0, '#eef2f3');
    grad.addColorStop(1, '#8e9eab');

    ctx.clearRect(0, 0, canvas.width, canvas.height); // clear canvas before drawing

    const topPadding = spacing;
    for (let i = 0; i < shownCells; i++) {
      const x = (width - rectWidth) / 2; // center horizontally
      const y = i * (rectHeight + spacing) + topPadding;

      // Draw rectangle
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, rectWidth, rectHeight, 2);
      ctx.fill();
      ctx.strokeStyle = 'darkgray';
      ctx.stroke();

      // Draw connecting line
      if (i < shownCells - 1) {
        ctx.strokeStyle = 'gray';
        ctx.beginPath();
        ctx.moveTo(x + rectWidth / 2, y + rectHeight);
        ctx.lineTo(x + rectWidth / 2, y + rectHeight + spacing);
        ctx.stroke();
      }

      if (shownCells < numCells) {
        ctx.strokeStyle = 'gray';
        ctx.beginPath();
        ctx.moveTo(x + rectWidth / 2, y + rectHeight);
        ctx.lineTo(x + rectWidth / 2, y + rectHeight + spacing);
        ctx.stroke();
        // Draw "more" text
        ctx.fillStyle = 'gray';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`...`, width / 2, height - 10);
      }
    }
  }, [numCells, height, width]);

  return <canvas ref={canvasRef} width={width} height={height} />;
}
