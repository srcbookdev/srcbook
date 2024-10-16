import { cn } from '@/lib/utils';
import { calculateSquares } from './lib/diff';

export function DiffStats(props: { additions: number; deletions: number; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', props.className)}>
      <span className="text-green-400">-{props.additions}</span>
      <span className="text-red-400">+{props.deletions}</span>
    </div>
  );
}

export function DiffSquares(props: { additions: number; deletions: number; className?: string }) {
  const squares = calculateSquares(props.additions, props.deletions);

  return (
    <div className={cn('flex items-center gap-0.5', props.className)}>
      {squares.map((square, index) => (
        <span
          key={index}
          className={cn('w-3 h-3 rounded-sm', {
            'bg-border': square === 0,
            'bg-red-400': square === -1,
            'bg-green-400': square === 1,
          })}
        />
      ))}
    </div>
  );
}
