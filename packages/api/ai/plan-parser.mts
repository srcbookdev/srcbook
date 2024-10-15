import { XMLParser } from 'fast-xml-parser';
import Path from 'node:path';

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
 *   <action type="command">
 *     <description>![CDATA[{Install dependencies}]]></description>
 *     <command>
 *       <![CDATA[
 *         npm install
 *       ]]>
 *     </command>
 *   </action>
 *   ...
 * </plan>
 */

interface File {
  type: 'file';
  dirname: string;
  basename: string;
  filename: string;
  content: string;
  description: string;
}

interface Command {
  type: 'command';
  content: string;
  description: string;
}

export interface Plan {
  actions: (File | Command)[];
}

interface ParsedResult {
  plan: {
    action:
      | {
          '@_type': string;
          description: string;
          file?: { '@_filename': string; '#text': string };
          command?: string;
        }[]
      | {
          '@_type': string;
          description: string;
          file?: { '@_filename': string; '#text': string };
          command?: string;
        };
  };
}

export function parsePlan(response: string): Plan {
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

    const plan: Plan = { actions: [] };
    const actions = Array.isArray(result.plan.action) ? result.plan.action : [result.plan.action];

    for (const action of actions) {
      if (action['@_type'] === 'file' && action.file) {
        plan.actions.push({
          type: 'file',
          filename: action.file['@_filename'],
          dirname: Path.dirname(action.file['@_filename']),
          basename: Path.basename(action.file['@_filename']),
          content: action.file['#text'],
          description: action.description,
        });
      } else if (action['@_type'] === 'command' && action.command) {
        plan.actions.push({
          type: 'command',
          content: action.command,
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
