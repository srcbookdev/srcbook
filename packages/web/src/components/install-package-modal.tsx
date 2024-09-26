import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { cn } from '@/lib/utils';
import { searchNpmPackages } from '@/lib/server';
import { Input } from '@srcbook/components/src/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@srcbook/components/src/components/ui/dialog';

import { usePackageJson } from './use-package-json';

type NPMPackageType = {
  name: string;
  version: string;
  description?: string;
};

function getSelected(results: NPMPackageType[], selectedName: string, type: 'next' | 'prev') {
  const idx = results.findIndex((r) => r.name === selectedName);
  const selectedIdx = type === 'next' ? idx + 1 : idx - 1;

  const len = results.length;

  if (selectedIdx < 0) {
    return results[len - 1]?.name ?? null;
  } else if (selectedIdx >= len) {
    return results[0]?.name ?? null;
  } else {
    return results[selectedIdx]?.name ?? null;
  }
}

export default function InstallPackageModal({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (val: boolean) => void;
}) {
  const [mode, setMode] = useState<'search' | 'loading' | 'success' | 'error'>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NPMPackageType[]>([]);
  const [pkg, setPkg] = useState<string>('');
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const { npmInstall, installing, output } = usePackageJson();

  const [value] = useDebounce(query, 300);

  useEffect(() => {
    setSelectedName(null);
    searchNpmPackages(value, 6) // Modal height works best with max 6 entries
      .then((data) => {
        const results = data.result;
        setResults(results);
        if (results.length > 0) {
          setSelectedName(results[0].name);
        }
      })
      .catch((e) => console.error('error:', e));
  }, [value]);

  useEffect(() => {
    if (mode === 'loading' && !installing) {
      setMode('success');
    }
  }, [mode, installing]);

  const addPackage = (packageName: string) => {
    setPkg(packageName);
    setMode('loading');
    npmInstall([packageName]);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          setQuery('');
          // Use a timeout to prevent flickering while it animates out
          setTimeout(() => setMode('search'), 300);
        } else {
          setMode('search');
        }
        setOpen(newOpen);
      }}
    >
      <DialogContent
        className={cn(
          'flex flex-col transition-height',
          mode === 'search' ? 'w-[800px] h-[484px]' : '',
        )}
      >
        {mode === 'error' && (
          <div className="flex flex-col w-full h-full items-center justify-center gap-3">
            <DialogTitle className="text-destructive">Something went wrong</DialogTitle>
            <p>Failed to install {pkg}, please try again.</p>
          </div>
        )}
        {mode === 'loading' && (
          <div className="flex w-full h-full items-center justify-center gap-3">
            <Loader2 className="animate-spin" />
            <p>Installing {pkg}</p>
          </div>
        )}
        {mode === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle>Successfully added {pkg}</DialogTitle>
            </DialogHeader>
            <p className="font-mono text-sm whitespace-pre-line">
              {output.map((o) => o.data).join('')}
            </p>
          </>
        )}
        {mode === 'search' && (
          <>
            <DialogHeader>
              <DialogTitle>Install NPM package</DialogTitle>
              <DialogDescription id="npm-search-modal">
                Search for packages to add to your Srcbook.
              </DialogDescription>
            </DialogHeader>
            <Input
              placeholder="Search for a package"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="npm-search-results"
              aria-labelledby="npm-search-modal"
              onKeyDown={(e) => {
                if (selectedName === null) {
                  return;
                }

                if (e.key === 'Enter') {
                  addPackage(selectedName);
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedName(getSelected(results, selectedName, 'next'));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedName(getSelected(results, selectedName, 'prev'));
                }
              }}
            />
            {results.length > 0 ? (
              <SearchResultsList
                results={results}
                selectedName={selectedName!}
                setSelectedName={setSelectedName}
                onSelect={addPackage}
              />
            ) : (
              <NoSearchResults />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function NoSearchResults() {
  return <p className="text-tertiary-foreground text-sm text-center">No results found.</p>;
}

function SearchResultsList(props: {
  results: NPMPackageType[];
  selectedName: string;
  setSelectedName: (name: string) => void;
  onSelect: (name: string) => void;
}) {
  return (
    <ul
      id="npm-search-results"
      role="listbox"
      aria-label="NPM search results"
      className="overflow-y-scroll focus:border-yellow-300"
    >
      {props.results.map((result) => {
        const selected = result.name === props.selectedName;

        return (
          <li
            key={result.name}
            role="option"
            aria-disabled="false"
            aria-selected={selected}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                props.onSelect(result.name);
              }
            }}
            className={cn(
              'px-2 py-1 rounded-sm cursor-pointer border border-transparent text-sm',
              selected && 'bg-muted border-border',
            )}
            onClick={() => props.onSelect(result.name)}
            onMouseEnter={() => props.setSelectedName(result.name)}
          >
            <div className="flex items-center gap-2 whitespace-nowrap">
              <strong className="truncate">{result.name}</strong>
              <span className="text-tertiary-foreground">{result.version}</span>
            </div>
            <p title={result.description} className="mt-1 text-tertiary-foreground truncate">
              {result.description}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
