import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { cn } from '@/lib/utils';
import { searchNpmPackages } from '@/lib/server';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePackageJson } from './use-package-json';

interface NPMPackageType {
  name: string;
  version: string;
  description?: string;
}

function getSelected(results: NPMPackageType[], selectedName: string, type: 'next' | 'prev') {
  const idx = results.findIndex((r) => r.name === selectedName);
  const selectedIdx = type === 'next' ? idx + 1 : idx - 1;

  const len = results.length;

  if (selectedIdx < 0) {
    return results[len - 1]?.name ?? null;
  } else if (selectedIdx >= len) {
    return results[0]?.name ?? null;
  }
  return results[selectedIdx]?.name ?? null;
}

export default function InstallPackageModal({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (val: boolean) => void;
}): JSX.Element {
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
        const packages = data.result;
        setResults(packages);
        if (results.length > 0) {
          setSelectedName(packages[0].name);
        }
      })
      .catch((e) => {
        console.error('error:', e);
      });
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
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          setQuery('');
          // Use a timeout to prevent flickering while it animates out
          setTimeout(() => {
            setMode('search');
          }, 300);
        } else {
          setMode('search');
        }
        setOpen(newOpen);
      }}
      open={open}
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
              aria-controls="npm-search-results"
              aria-expanded={results.length > 0}
              aria-labelledby="npm-search-modal"
              onChange={(e) => {
                setQuery(e.target.value);
              }}
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
              placeholder="Search for a package"
              role="combobox"
              value={query}
            />
            {results.length > 0 ? (
              <SearchResultsList
                onSelect={addPackage}
                results={results}
                selectedName={selectedName ?? ''}
                setSelectedName={setSelectedName}
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
      aria-label="NPM search results"
      className="overflow-y-scroll focus:border-yellow-300"
      id="npm-search-results"
      role="listbox"
    >
      {props.results.map((result) => {
        const selected = result.name === props.selectedName;

        return (
          <li
            aria-disabled="false"
            aria-selected={selected}
            className={cn(
              'px-2 py-1 rounded-sm cursor-pointer border border-transparent text-sm',
              selected && 'bg-muted border-border',
            )}
            key={result.name}
            onClick={() => {
              props.onSelect(result.name);
            }}
            onMouseEnter={() => {
              props.setSelectedName(result.name);
            }}
            role="option"
          >
            <div className="flex items-center gap-2 whitespace-nowrap">
              <strong className="truncate">{result.name}</strong>
              <span className="text-tertiary-foreground">{result.version}</span>
            </div>
            <p className="mt-1 text-tertiary-foreground truncate" title={result.description}>
              {result.description}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
