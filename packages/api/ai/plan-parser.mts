import { XMLParser } from 'fast-xml-parser';
import Path from 'node:path';
import { type App as DBAppType } from '../db/schema.mjs';
import { loadFile } from '../apps/disk.mjs';

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

export async function parsePlan(response: string, app: DBAppType): Promise<Plan> {
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

    const plan: Plan = { actions: [], description: result.plan.planDescription };
    const actions = Array.isArray(result.plan.action) ? result.plan.action : [result.plan.action];

    for (const action of actions) {
      if (action['@_type'] === 'file' && action.file) {
        const filePath = action.file['@_filename'];
        let originalContent = null;

        try {
          const fileContent = await loadFile(app, filePath);
          originalContent = fileContent.source;
        } catch (error) {
          console.error(`Error reading original file ${filePath}:`, error);
          // If the file doesn't exist, we'll leave the original content as null
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

    console.log('parsed plan', plan);
    return plan;
  } catch (error) {
    console.error('Error parsing XML:', error);
    throw new Error('Failed to parse XML response');
  }
}
