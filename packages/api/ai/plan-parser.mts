import { XMLParser } from 'fast-xml-parser';
import Path from 'node:path';
import { type App as DBAppType } from '../db/schema.mjs';
import { loadFile } from '../apps/disk.mjs';
import { StreamingXMLParser, TagType } from './stream-xml-parser.mjs';
import { ActionChunkType, DescriptionChunkType } from '@srcbook/shared';

// The ai proposes a plan that we expect to contain both files and commands
// Here is an example of a plan:

/*
 * Example of a plan:
 *
 * <plan>
 *   <action type="file">
 *     <description>{Short justification of changes. Be as brief as possible, like a commit message}</description>
 *     <file filename="package.json">
 *         <![CDATA[{entire file contents}]]]]>
 *     </file>
 *   </action>
 *   <action type="file">
 *     <description>
 *         <![CDATA[{Short description of changes}]]>
 *     </description>
 *     <file filename="./App.tsx">
 *       <![CDATA[
 *         {... file contents (ALL OF THE FILE)}
 *       ]]>
 *     </file>
 *   </action>
 *
 *  <action type="command">
 *    <description>
 *      <![CDATA[
 *        Install required packages for state management and routing
 *      ]]>
 *    </description>
 *    <commandType>npm install</commandType>
 *    <package>react-redux</package>
 *    <package>react-router-dom</package>
 *  </action>
 *   ...
 * </plan>
 */

interface FileAction {
  type: 'file';
  dirname: string;
  basename: string;
  path: string;
  modified: string;
  original: string | null; // null if this is a new file. Consider using an enum for 'edit' | 'create' | 'delete' instead.
  description: string;
}

type NpmInstallCommand = {
  type: 'command';
  command: 'npm install';
  packages: string[];
  description: string;
};

// Later we can add more commands. For now, we only support npm install
type Command = NpmInstallCommand;

export interface Plan {
  // The high level description of the plan
  // Will be shown to the user above the diff box.
  id: string;
  query: string;
  description: string;
  actions: (FileAction | Command)[];
}

interface ParsedResult {
  plan: {
    planDescription: string;
    action:
      | {
          '@_type': string;
          description: string;
          file?: { '@_filename': string; '#text': string };
          commandType?: string;
          package?: string | string[];
        }[]
      | {
          '@_type': string;
          description: string;
          file?: { '@_filename': string; '#text': string };
          commandType?: string;
          package?: string | string[];
        };
  };
}

export async function parsePlan(
  response: string,
  app: DBAppType,
  query: string,
  planId: string,
): Promise<Plan> {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
    });
    const result = parser.parse(response) as ParsedResult;

    if (!result.plan) {
      throw new Error('Invalid response: missing plan tag');
    }

    const plan: Plan = {
      id: planId,
      query,
      actions: [],
      description: result.plan.planDescription,
    };
    const actions = Array.isArray(result.plan.action) ? result.plan.action : [result.plan.action];

    for (const action of actions) {
      if (action['@_type'] === 'file' && action.file) {
        const filePath = action.file['@_filename'];
        let originalContent = null;

        try {
          const fileContent = await loadFile(app, filePath);
          originalContent = fileContent.source;
        } catch (error) {
          // If the file doesn't exist, it's likely that it's a new file.
        }

        plan.actions.push({
          type: 'file',
          path: filePath,
          dirname: Path.dirname(filePath),
          basename: Path.basename(filePath),
          modified: action.file['#text'],
          original: originalContent,
          description: action.description,
        });
      } else if (action['@_type'] === 'command' && action.commandType === 'npm install') {
        if (!action.package) {
          console.error('Invalid response: missing package tag');
          continue;
        }
        plan.actions.push({
          type: 'command',
          command: 'npm install',
          packages: Array.isArray(action.package) ? action.package : [action.package],
          description: action.description,
        });
      }
    }

    return plan;
  } catch (error) {
    console.error('Error parsing XML:', error);
    throw new Error('Failed to parse XML response');
  }
}

export function getPackagesToInstall(plan: Plan): string[] {
  return plan.actions
    .filter(
      (action): action is NpmInstallCommand =>
        action.type === 'command' && action.command === 'npm install',
    )
    .flatMap((action) => action.packages);
}
export async function streamParsePlan(
  stream: AsyncIterable<string>,
  app: DBAppType,
  _query: string,
  planId: string,
) {
  let parser: StreamingXMLParser;
  const parsePromises: Promise<void>[] = [];

  return new ReadableStream({
    async pull(controller) {
      if (parser === undefined) {
        parser = new StreamingXMLParser({
          async onTag(tag) {
            if (tag.name === 'planDescription' || tag.name === 'action') {
              const promise = (async () => {
                const chunk = await toStreamingChunk(app, tag, planId);
                if (chunk) {
                  controller.enqueue(JSON.stringify(chunk) + '\n');
                }
              })();
              parsePromises.push(promise);
            }
          },
        });
      }

      try {
        for await (const chunk of stream) {
          parser.parse(chunk);
        }
        // Wait for all pending parse operations to complete before closing
        await Promise.all(parsePromises);
        controller.close();
      } catch (error) {
        console.error(error);
        controller.enqueue(
          JSON.stringify({
            type: 'error',
            data: { content: 'Error while parsing streaming response' },
          }) + '\n',
        );
        controller.error(error);
      }
    },
  });
}

async function toStreamingChunk(
  app: DBAppType,
  tag: TagType,
  planId: string,
): Promise<DescriptionChunkType | ActionChunkType | null> {
  switch (tag.name) {
    case 'planDescription':
      return {
        type: 'description',
        planId: planId,
        data: { content: tag.content },
      } as DescriptionChunkType;
    case 'action': {
      const descriptionTag = tag.children.find((t) => t.name === 'description');
      const description = descriptionTag?.content ?? '';
      const type = tag.attributes.type;

      if (type === 'file') {
        const fileTag = tag.children.find((t) => t.name === 'file')!;

        const filePath = fileTag.attributes.filename as string;
        let originalContent = null;

        try {
          const fileContent = await loadFile(app, filePath);
          originalContent = fileContent.source;
        } catch (error) {
          // If the file doesn't exist, it's likely that it's a new file.
        }

        return {
          type: 'action',
          planId: planId,
          data: {
            type: 'file',
            description,
            path: filePath,
            dirname: Path.dirname(filePath),
            basename: Path.basename(filePath),
            modified: fileTag.content,
            original: originalContent,
          },
        } as ActionChunkType;
      } else if (type === 'command') {
        const commandTag = tag.children.find((t) => t.name === 'commandType')!;
        const packageTags = tag.children.filter((t) => t.name === 'package');

        return {
          type: 'action',
          planId: planId,
          data: {
            type: 'command',
            description,
            command: commandTag.content,
            packages: packageTags.map((t) => t.content),
          },
        } as ActionChunkType;
      } else {
        return null;
      }
    }
    default:
      return null;
  }
}
