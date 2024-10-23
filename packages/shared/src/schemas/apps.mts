import z from 'zod';

export const FileSchema = z.object({
  path: z.string(),
  name: z.string(),
  source: z.string(),
  binary: z.boolean(),
});

// TODO: rework all this just trying to architecht out the data structure

/** All requests for app should have this field */
export const Meta = z.object({ root: z.string() });

/** All location based requests should use this, typed as
 *
 * file: file path; target file for the opperation
 * location: optional with a start point of ln:o and optional end point of ln:o
 */
export const RequestLocation = z.object({
  file: z.string(),
  location: z
    .object({
      start: z.object({
        line: z.number(),
        offset: z.number(),
      }),
      end: z
        .object({
          line: z.number(),
          offset: z.number(),
        })
        .optional(),
    })
    .optional(),
});

type lno = {
  line: number;
  offset: number;
};

const enum Level {
  Info,
  Warn,
  Error,
}

const enum Topics {
  RunDev,
  QuickInfo,
  Diagnostics,
  Completion,
  CreateFile,
  UpdateFile,
  DeleteFile,
  ImportDeps,
  InstallDep,
}

type Message<T extends { loc?: boolean; pos?: boolean; end?: boolean } = {}, ExtraType = {}> = {
  root: string;
  topic: Topics;
} & (T extends { loc: true }
  ? {
      location: {
        file: string;
      } & (T extends { pos: true }
        ? {
            position: {
              start: lno;
            } & (T extends { end: true }
              ? {
                  end: lno;
                }
              : {});
          }
        : {});
    }
  : {}) &
  ExtraType;

const run_dev: Message = {
  root: '/Users/name/.srcbook/apps/dfjksaljr3evj',
  topic: Topics.RunDev,
};

const request_quick_info: Message<{ loc: true; pos: true }> = {
  root: '/Users/name/.srcbook/apps/dfjksaljr3evj',
  location: {
    file: '/src/App.tsx',
    position: { start: { line: 34, offset: 16 } },
  },
  topic: Topics.QuickInfo,
};

const quick_info: Message<
  {},
  { message: string | { documentation: string; tags: Array<{ name: string; text: string }> } }
> = {
  root: '/Users/name/.srcbook/apps/dfjksaljr3evj',
  message: {
    documentation:
      'Appends new elements to the end of an array, and returns the new length of the array.',
    tags: [
      {
        name: 'param',
        text: 'items New elements to add to the array.',
      },
    ],
  },
  topic: Topics.QuickInfo,
};

const request_diagnostics: Message<{ loc: true }> = {
  root: '/Users/name/.srcbook/apps/dfjksaljr3evj',
  location: {
    file: '/src/App.tsx',
  },
  topic: Topics.Diagnostics,
};

const diagnostics: Message<
  { loc: true; pos: true; end: true },
  { level: Level; message: string | object }
> = {
  root: '/Users/name/.srcbook/apps/dfjksaljr3evj',
  location: {
    file: '/src/App.tsx',
    position: {
      start: { line: 34, offset: 16 },
      end: { line: 34, offset: 22 },
    },
  },
  level: Level.Error,
  message: 'no method named fibo, but similar method named fib',
  topic: Topics.Diagnostics,
};

const completion: Message<{ loc: true; pos: true }> = {
  root: '/Users/name/.srcbook/apps/dfjksaljr3evj',
  location: {
    file: '/src/App.tsx',
    position: { start: { line: 46, offset: 6 } },
  },
  topic: Topics.Completion,
};

const create_file: Message<{ loc: true }, { content: string }> = {
  root: '/Users/name/.srcbook/apps/dfjksaljr3evj',
  location: {
    file: '/src/Counter.tsx',
  },
  topic: Topics.CreateFile,
  content: 'export function Counter(): { ... }',
};

const update_file: Message<{ loc: true; pos: true; end: true }, { content: string }> = {
  root: '/Users/name/.srcbook/apps/dfjksaljr3evj',
  location: {
    file: '/src/Counter.tsx',
    position: {
      start: { line: 2, offset: 0 },
      end: { line: 3, offset: 0 },
    },
  },
  topic: Topics.UpdateFile,
  content: '  const [count, setCount] = React.useState<number>(0);\n',
};

const delete_file: Message<{ loc: true }> = {
  root: '/Users/name/.srcbook/apps/dfjksaljr3evj',
  location: {
    file: '/src/Counter.tsx',
  },
  topic: Topics.DeleteFile,
};

const import_deps: Message = {
  root: '/Users/name/.srcbook/apps/dfjksaljr3evj',
  topic: Topics.ImportDeps,
};

const install_dep: Message<{}, { package: string; version: string }> = {
  root: '/Users/name/.srcbook/apps/dfjksaljr3evj',
  package: 'webls',
  version: '1.0.0',
  topic: Topics.ImportDeps,
};
