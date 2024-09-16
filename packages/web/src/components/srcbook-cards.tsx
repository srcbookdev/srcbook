import { Sparkles, Circle, PlusIcon, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CodeLanguageType } from '@srcbook/shared';
import { SrcbookLogo } from './logos';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { ExampleSrcbookType } from '@/types';

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

export function MainCTACard(props: { srcbook: ExampleSrcbookType; onClick: () => void }) {
  const { srcbook, onClick } = props;

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className="flex flex-col items-center cursor-pointer border hover:border-foreground transition-colors active:translate-y-0.5 rounded-sm"
      onClick={onClick}
    >
      <div className="w-full grow h-[130px] bg-sb-core-20 rounded-t-[2px] flex items-center justify-center">
        <SrcbookLogo size={64} className="text-sb-core-40" />
      </div>
      <div className="w-full relative overflow-clip">
        <LongDashedHorizontalLine className="absolute top-[10px] text-border" />
        <LongDashedHorizontalLine className="absolute bottom-[10px] text-border" />
        <LongDashedVerticalLine className="absolute left-[10px] top-0 text-border" />
        <LongDashedVerticalLine className="absolute right-[10px] top-0 text-border" />
        <div className="w-full flex-1 p-6 space-y-2">
          <h4 className="h5 line-clamp-2">{srcbook.title}</h4>
          <p className="text-sm text-ter tiary-foreground line-clamp-2">{srcbook.description}</p>
          <div className="flex items-center justify-between">
            <div className="space-x-1">
              {srcbook.tags.map((tag) => (
                <Tag key={tag} value={tag} />
              ))}
            </div>
            <span className="font-mono text-sm text-tertiary-foreground">
              {srcbook.language === 'typescript' ? 'TS' : 'JS'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tag(props: { value: string }) {
  return (
    <span className="px-1.5 py-1 text-[13px] bg-sb-yellow-20 text-sb-yellow-70 dark:bg-sb-yellow-50 dark:text-sb-core-160 rounded-sm">
      {props.value}
    </span>
  );
}

export function CardContainer({
  className,
  onClick,
  children,
  ...props
}: React.ComponentPropsWithoutRef<'div'> & {
  onClick?: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      {...props}
      onClick={onClick}
      className={cn(
        'group border relative rounded-sm h-[108px] overflow-clip cursor-pointer transition-colors text-sm',
        className,
      )}
    >
      <LongDashedHorizontalLine className="absolute top-[10px] text-border" />
      <LongDashedHorizontalLine className="absolute bottom-[10px] text-border" />
      <LongDashedVerticalLine className="absolute left-[10px] text-border" />
      <LongDashedVerticalLine className="absolute right-[10px] text-border" />
      <div className="px-5 py-4 h-full flex flex-col justify-between">{children}</div>
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
    <CardContainer
      onClick={props.onClick}
      className={cn(
        'active:translate-y-0.5',
        props.running ? 'border-run' : 'hover:border-foreground',
      )}
    >
      <h5 className="font-semibold leading-[18px] line-clamp-2">{props.title}</h5>
      <div className="flex items-center justify-between text-tertiary-foreground">
        <div className="text-[13px] flex items-center gap-2">
          {props.running ? (
            <>
              <Circle size={14} strokeWidth={3} className="text-run" />
              <span>Running</span>
            </>
          ) : (
            <>
              <SrcbookLogo className="text-foreground" size={16} />
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
    </CardContainer>
  );
}

function BigButton(props: { onClick: () => void; className?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={props.onClick}
      className={cn(
        'w-full sm:w-[216px] sm:max-w-[216px] h-24 p-3 bg-background border rounded-sm hover:border-ring transition-all',
        props.className,
      )}
    >
      {props.children}
    </button>
  );
}
export function GenerateSrcbookButton(props: { onClick: () => void }) {
  return (
    <BigButton onClick={props.onClick}>
      <div className="flex flex-col h-full items-start justify-between">
        <Sparkles size={20} />
        <h5 className="font-medium leading-[18px]">Generate Srcbook</h5>
      </div>
    </BigButton>
  );
}

export function CreateSrcbookButton(props: {
  defaultLanguage: CodeLanguageType;
  onSubmit: (language: CodeLanguageType) => void;
}) {
  const [language, setLanguage] = useState(props.defaultLanguage);

  return (
    <div className="space-y-1">
      <BigButton onClick={() => props.onSubmit(language)}>
        <div className="flex flex-col h-full items-start justify-between">
          <PlusIcon size={20} />
          <h5 className="font-medium leading-[18px]">Create Srcbook</h5>
        </div>
      </BigButton>

      <div className="flex border rounded-sm bg-background w-fit">
        <Button
          title="Use JavaScript for this Srcbook"
          variant="secondary"
          className={cn(
            'border-none rounded-r-none active:translate-y-0 text-muted-foreground bg-muted w-10',
            language === 'javascript' && 'text-foreground font-bold',
          )}
          onClick={() => setLanguage('javascript')}
        >
          JS
        </Button>
        <Button
          title="Use TypeScript for this Srcbook"
          variant="secondary"
          className={cn(
            'border-none rounded-l-none active:translate-y-0 text-muted-foreground bg-muted w-10',
            language === 'typescript' && 'text-foreground font-bold',
          )}
          onClick={() => setLanguage('typescript')}
        >
          TS
        </Button>
      </div>
    </div>
  );
}

export function ImportSrcbookButton(props: { onClick: () => void }) {
  return (
    <BigButton
      onClick={props.onClick}
      className="border-dashed hover:border-solid focus-within:border-foreground"
    >
      <div className="flex flex-col h-full items-start justify-between">
        <Upload size={20} />
        <div className="flex flex-col items-start gap-1">
          <h5 className="font-medium leading-none">Open Srcbook</h5>
          <p className="leading-none text-[13px] text-tertiary-foreground">
            or drag 'n drop <span className="font-medium">.src.md</span> file
          </p>
        </div>
      </div>
    </BigButton>
  );
}
