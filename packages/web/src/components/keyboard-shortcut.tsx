import React from 'react';

type Platform = 'mac' | 'windows' | 'linux' | 'other';
type KeyType = 'mod' | 'alt';

const getPlatform = () => {
  const platform = navigator.platform.toLowerCase();
  const userAgent = navigator.userAgent.toLowerCase();

  if (platform.includes('mac') || userAgent.includes('mac')) {
    return 'mac';
  } else if (platform.includes('win') || userAgent.includes('win')) {
    return 'windows';
  } else if (platform.includes('linux') || userAgent.includes('linux')) {
    return 'linux';
  } 
    return 'other';
  
};

const keyMappings: Record<KeyType, Record<Platform, string>> = {
  mod: {
    mac: '⌘',
    windows: 'Ctrl',
    linux: 'Ctrl',
    other: 'Ctrl',
  },
  alt: {
    mac: '⌥',
    windows: 'Alt',
    linux: 'Alt',
    other: 'Alt',
  },
};

const getPlatformSpecificKey = (keyType: KeyType): string => {
  const platform = getPlatform();
  return keyMappings[keyType][platform];
};

export default function Shortcut({ keys }: { keys: string[] }) {
  // Replace keys that are in the keyMappings with the platform specific key
  keys = keys.map((key) => {
    if (key === 'mod') {
      return getPlatformSpecificKey('mod');
    } else if (key === 'alt') {
      return getPlatformSpecificKey('alt');
    } 
      return key;
    
  });
  return (
    <>
      {keys.map((key) => {
        return (
          <React.Fragment key={key}>
            <span className="font-mono bg-background text-foreground border py-[1px] px-1.5 rounded-sm drop-shadow-key mx-0.5">
              {key}
            </span>
          </React.Fragment>
        );
      })}
    </>
  );
}
