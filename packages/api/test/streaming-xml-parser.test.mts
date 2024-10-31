import fs from 'node:fs';
import Path from 'node:path';
import { StreamingXMLParser, type TagType } from '../ai/stream-xml-parser.mjs';

const filepath = new URL(import.meta.url).pathname;

function getExampleChunks(filename: string) {
  const chunkLines = fs.readFileSync(Path.resolve(filepath, filename), 'utf-8');
  return chunkLines
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((chunk) => JSON.parse(chunk).chunk);
}

describe('parsePlan', () => {
  test('should correctly parse a plan with file and command actions', async () => {
    const tags: TagType[] = [];
    const parser = new StreamingXMLParser({
      onTag: (tag) => {
        if (tag.name === 'planDescription' || tag.name === 'action') {
          tags.push(tag);
        }
      },
    });
    getExampleChunks('../plan-chunks.txt').forEach((chunk) => parser.parse(chunk));
    expect(tags).toEqual([
      {
        name: 'planDescription',
        attributes: {},
        content:
          "Update the mock data to include classic rock bands in the trending albums section. I'll modify the albums data to include The Beatles, Talking Heads, Grateful Dead, and Radiohead with their iconic albums.",
        children: [],
      },
      {
        name: 'action',
        attributes: { type: 'file' },
        content: '',
        children: [
          {
            name: 'description',
            attributes: {},
            content: 'Update mock data with classic rock albums for the trending section',
            children: [],
          },
          {
            name: 'file',
            attributes: { filename: 'src/data/mockData.ts' },
            content: `
import { Album, PlaylistItem } from '../types';

export const albums: Album[] = [
  {
    id: '1',
    title: 'Abbey Road',
    artist: 'The Beatles',
    cover: 'https://picsum.photos/seed/beatles/300/300',
  },
  {
    id: '2',
    title: 'Remain in Light',
    artist: 'Talking Heads',
    cover: 'https://picsum.photos/seed/talking/300/300',
  },
  {
    id: '3',
    title: 'American Beauty',
    artist: 'Grateful Dead',
    cover: 'https://picsum.photos/seed/dead/300/300',
  },
  {
    id: '4',
    title: 'OK Computer',
    artist: 'Radiohead',
    cover: 'https://picsum.photos/seed/radiohead/300/300',
  },
  {
    id: '5',
    title: 'Un Verano Sin Ti',
    artist: 'Bad Bunny',
    cover: 'https://picsum.photos/seed/5/300/300',
  },
  {
    id: '6',
    title: '30',
    artist: 'Adele',
    cover: 'https://picsum.photos/seed/6/300/300',
  },
];

export const playlists: PlaylistItem[] = [
  { id: '1', name: 'Liked Songs', icon: '❤️' },
  { id: '2', name: 'Your Episodes', icon: '🎙️' },
  { id: '3', name: 'Rock Classics', icon: '🎸' },
  { id: '4', name: 'Chill Vibes', icon: '🌊' },
];`.trim(),
            children: [],
          },
        ],
      },
    ]);
  });

  test('should correctly parse a plan with file and command actions', async () => {
    const tags: TagType[] = [];
    const parser = new StreamingXMLParser({
      onTag: (tag) => {
        if (tag.name === 'planDescription' || tag.name === 'action') {
          tags.push(tag);
        }
      },
    });
    getExampleChunks('../plan-chunks-2.txt').forEach((chunk) => parser.parse(chunk));
    expect(tags).toEqual([
      {
        name: 'planDescription',
        attributes: {},
        content:
          "I'll update the mock data to include Phish albums instead of the current albums. I'll use real Phish album covers and titles to make it more authentic.",
        children: [],
      },
      {
        name: 'action',
        attributes: { type: 'file' },
        content: '',
        children: [
          {
            name: 'description',
            attributes: {},
            content: 'Update mockData.ts to include Phish albums with real album information',
            children: [],
          },
          {
            name: 'file',
            attributes: { filename: 'src/data/mockData.ts' },
            content: `
import { Album, PlaylistItem } from '../types';

export const albums: Album[] = [
  {
    id: '1',
    title: 'A Picture of Nectar',
    artist: 'Phish',
    cover: 'https://i.scdn.co/image/ab67616d0000b273f3912ffc6e6533d0aae3c58d',
  },
  {
    id: '2',
    title: 'Billy Breathes',
    artist: 'Phish',
    cover: 'https://i.scdn.co/image/ab67616d0000b273f4c8d14e6c2d8b0651388be6',
  },
  {
    id: '3',
    title: 'Farmhouse',
    artist: 'Phish',
    cover: 'https://i.scdn.co/image/ab67616d0000b273f5a0be2976c3df8baae5d5b1',
  },
  {
    id: '4',
    title: 'Story of the Ghost',
    artist: 'Phish',
    cover: 'https://i.scdn.co/image/ab67616d0000b273f00669d9866452b5f49f4989',
  },
  {
    id: '5',
    title: 'Hoist',
    artist: 'Phish',
    cover: 'https://i.scdn.co/image/ab67616d0000b273f5c500e2fa5f1d0ae5dce4df',
  },
  {
    id: '6',
    title: 'Sigma Oasis',
    artist: 'Phish',
    cover: 'https://i.scdn.co/image/ab67616d0000b273a0c79aba3b83f5f016f47737',
  },
];

export const playlists: PlaylistItem[] = [
  { id: '1', name: 'Liked Songs', icon: '❤️' },
  { id: '2', name: 'Your Episodes', icon: '🎙️' },
  { id: '3', name: 'Rock Classics', icon: '🎸' },
  { id: '4', name: 'Chill Vibes', icon: '🌊' },
];
      `.trim(),
            children: [],
          },
        ],
      },
      {
        name: 'action',
        attributes: { type: 'command' },
        content: '',
        children: [
          {
            name: 'description',
            attributes: {},
            content: 'Install react-router',
            children: [],
          },
          {
            name: 'commandType',
            attributes: {},
            content: 'npm install',
            children: [],
          },
          {
            name: 'package',
            attributes: {},
            content: 'react-router',
            children: [],
          },
        ],
      },
    ]);
  });
});
