import fs from 'node:fs';
import Path from 'node:path';
import { StreamingXMLParser, type TagType } from '../ai/stream-xml-parser.mjs';

const filepath = new URL(import.meta.url).pathname;

const mockDataContents = `
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
];
      `;

const chunkLines = fs.readFileSync(Path.resolve(filepath, '../plan-chunks.txt'), 'utf-8');
const chunks = chunkLines
  .split('\n')
  .filter((line) => line.trim() !== '')
  .map((chunk) => JSON.parse(chunk).chunk);

describe('parsePlan', () => {
  test('should correctly parse a plan with file and command actions', async () => {
    const tags: TagType[] = [];

    const parser = new StreamingXMLParser({
      onTag: (tag) => {
        tags.push(tag);
      },
    });

    chunks.forEach((chunk) => parser.parse(chunk));

    expect(tags).toEqual([
      {
        name: 'planDescription',
        attributes: {},
        content:
          "\nUpdate the mock data to include classic rock bands in the trending albums section. I'll modify the albums data to include The Beatles, Talking Heads, Grateful Dead, and Radiohead with their iconic albums.\n    ",
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
            content: '\nUpdate mock data with classic rock albums for the trending section\n      ',
            children: [],
          },
          {
            name: 'file',
            attributes: { filename: 'src/data/mockData.ts' },
            content: mockDataContents,
            children: [],
          },
        ],
      },
    ]);
  });
});
