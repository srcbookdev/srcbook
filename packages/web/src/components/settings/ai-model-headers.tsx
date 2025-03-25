import { cn } from '@srcbook/components';
import { Button } from '@srcbook/components/src/components/ui/button';
import { Input } from '@srcbook/components/src/components/ui/input';
import { Trash2 } from 'lucide-react';

export type AiModelHeader = {
  key: string;
  value: string;
};

type AiModelHeadersProps = {
  value: Array<AiModelHeader>;
  onChange: (value: Array<AiModelHeader>) => void;
};

function AiModelHeaderRemoveButton({ onRemove }: { onRemove: () => void }) {
  return (
    <Button variant="ghost" size="icon" onClick={onRemove}>
      <Trash2 size={16} />
    </Button>
  );
}

function AiModelHeaderRemoveEmptyButton() {
  return (
    <div>
      <div className="w-[18px]" />
    </div>
  );
}

export default function AiModelHeaders({ value, onChange }: AiModelHeadersProps) {
  function handleChange(index: number, param: 'key' | 'value', paramValue: string) {
    const newHeaders = [...value];

    let newHeader = newHeaders[index];
    if (!newHeader) {
      newHeader = { key: '', value: '' };
      newHeaders.push(newHeader);
    }

    newHeader[param] = paramValue;
    onChange(newHeaders);
  }

  function handleRemove(index: number) {
    const newHeaders = value.filter((_, i) => i !== index);
    onChange(newHeaders);
  }

  const headersWithNew = [...value, { key: '', value: '' }];
  const lastHeaderIndex = headersWithNew.length - 1;

  const isValid = (index: number, param: 'key' | 'value') => index >= lastHeaderIndex || headersWithNew[index]?.[param] !== '';

  return (
    <div className="flex flex-col gap-2">
      {headersWithNew?.map((header, index) => (
        <div className="flex gap-2" key={index}>
          {index < lastHeaderIndex
            ? <AiModelHeaderRemoveButton onRemove={() => handleRemove(index)} />
            : <AiModelHeaderRemoveEmptyButton />
          }
          <div className="w-full">
            <Input
              placeholder='key'
              value={header.key}
              onChange={(e) => handleChange(index, 'key', e.target.value)}
              required={index < lastHeaderIndex}
              className={cn(
                '[&.invalid:not(:focus)]:border-red-500',
                isValid(index, 'key') ? 'valid' : 'invalid',
              )}
            />
          </div>
          <div className="w-full">
            <Input
              placeholder='value'
              value={header.value}
              onChange={(e) => handleChange(index, 'value', e.target.value)}
              required={index < lastHeaderIndex}
              className={cn(
                '[&.invalid:not(:focus)]:border-red-500',
                isValid(index, 'value') ? 'valid' : 'invalid',
              )}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
