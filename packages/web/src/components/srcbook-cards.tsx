import { CodeLanguageType } from '@srcbook/shared';
import { SrcbookLogo } from './logos';
import { Circle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function LongDashedHorizontalLine(props: { className?: string }) {
  return (
    <div className={props.className}>
      <svg width="1000" height="2" viewBox="0 -1 1000 2" xmlns="http://www.w3.org/2000/svg">
        <line
          x1="0"
          y1="0"
          x2="1000"
          y2="0"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="8, 4"
        />
      </svg>
    </div>
  );
}

function LongDashedVerticalLine(props: { className?: string }) {
  return (
    <div className={props.className}>
      <svg width="2" height="1000" viewBox="-1 0 2 1000" xmlns="http://www.w3.org/2000/svg">
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="1000"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="8, 4"
        />
      </svg>
    </div>
  );
}

type SrcbookCardPropsType = {
  title: string;
  running: boolean;
  cellCount: number;
  language: CodeLanguageType;
  onClick: () => void;
  onDelete: () => void;
};

export function SrcbookCard(props: SrcbookCardPropsType) {
  function onDelete(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    props.onDelete();
  }

  return (
    <div
      onClick={props.onClick}
      className={cn(
        'group border relative rounded-sm min-w-52 h-[108px] overflow-clip hover:ring-1 cursor-pointer',
        props.running ? 'border-run hover:ring-run' : 'border-border hover:ring-ring',
        'transition-all',
      )}
    >
      <LongDashedHorizontalLine className="absolute top-[10px] text-border" />
      <LongDashedHorizontalLine className="absolute bottom-[10px] text-border" />
      <LongDashedVerticalLine className="absolute left-[10px] text-border" />
      <LongDashedVerticalLine className="absolute right-[10px] text-border" />
      <div className="px-5 py-4 h-full flex flex-col justify-between text-sm">
        <h4 className="font-semibold leading-[18px]">{props.title}</h4>
        <div className="flex items-center justify-between text-tertiary-foreground">
          <div className="text-[13px] flex items-center gap-2">
            {props.running ? (
              <>
                <Circle size={14} strokeWidth={3} className="text-run" />
                <span>Running</span>
              </>
            ) : (
              <>
                <SrcbookLogo className="text-foreground" width={16} height={18} />
                <span>
                  {props.cellCount} {props.cellCount === 1 ? 'Cell' : 'Cells'}
                </span>
              </>
            )}
          </div>
          <code className="font-mono group-hover:hidden">
            {props.language === 'javascript' ? 'JS' : 'TS'}
          </code>
          <button
            type="button"
            onClick={onDelete}
            className="hidden group-hover:block hover:text-foreground"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
