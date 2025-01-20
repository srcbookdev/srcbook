import { streamText, generateText, type GenerateTextResult } from 'ai';
import { getModel } from './config.mjs';
import {
  type CodeLanguageType,
  type CellType,
  type CodeCellType,
  randomid,
  type CellWithPlaceholderType,
} from '@srcbook/shared';
import { type SessionType } from '../types.mjs';
import { readFileSync } from 'node:fs';
import Path from 'node:path';
import { PROMPTS_DIR } from '../constants.mjs';
import { encode, decodeCells } from '../srcmd.mjs';
import { buildProjectXml, type FileContent } from '../ai/app-parser.mjs';
import { logAppGeneration } from './logger.mjs';
import mcpHubInstance from '../mcp/mcphub.mjs';

const makeGenerateSrcbookSystemPrompt = () => {
  return readFileSync(Path.join(PROMPTS_DIR, 'srcbook-generator.txt'), 'utf-8');
};

const makeGenerateCellSystemPrompt = (language: CodeLanguageType) => {
  return readFileSync(Path.join(PROMPTS_DIR, `cell-generator-${language}.txt`), 'utf-8');
};

const makeFixDiagnosticsSystemPrompt = () => {
  return readFileSync(Path.join(PROMPTS_DIR, 'fix-cell-diagnostics.txt'), 'utf-8');
};
const makeAppBuilderSystemPrompt = () => {
  return readFileSync(Path.join(PROMPTS_DIR, 'app-builder.txt'), 'utf-8');
};
const makeAppEditorSystemPrompt = () => {
  return readFileSync(Path.join(PROMPTS_DIR, 'app-editor.txt'), 'utf-8');
};

const makeAppEditorUserPrompt = (projectId: string, files: FileContent[], query: string, sequentialthinking: {}) => {
  const projectXml = buildProjectXml(files, projectId);
  const userRequestXml = `<userRequest>${query}</userRequest>`;
  const sequentialthinkingXml = `<sequentialthinking>${sequentialthinking}</sequentialthinking>`;
  return `Following below are the project XML and the user request.

${projectXml}

${userRequestXml}

${sequentialthinkingXml}
  `.trim();
};

const makeAppCreateUserPrompt = (projectId: string, files: FileContent[], query: string) => {
  const projectXml = buildProjectXml(files, projectId);
  const userRequestXml = `<userRequest>${query}</userRequest>`;
  return `Following below are the project XML and the user request.

${projectXml}

${userRequestXml}
  `.trim();
};

const makeGenerateCellUserPrompt = (session: SessionType, insertIdx: number, query: string) => {
  // Make sure we copy cells so we don't mutate the session
  const cellsWithPlaceholder: CellWithPlaceholderType[] = [...session.cells];

  cellsWithPlaceholder.splice(insertIdx, 0, {
    id: randomid(),
    type: 'placeholder',
    text: '==== INTRODUCE CELL HERE ====',
  });

  // Intentionally not passing in tsconfig.json here as that doesn't need to be in the prompt.
  const inlineSrcbookWithPlaceholder = encode(
    { cells: cellsWithPlaceholder, language: session.language },
    {
      inline: true,
    },
  );

  const prompt = `==== BEGIN SRCBOOK ====
${inlineSrcbookWithPlaceholder}
==== END SRCBOOK ====

==== BEGIN USER REQUEST ====
${query}
==== END USER REQUEST ====`;
  return prompt;
};

const makeFixDiagnosticsUserPrompt = (
  session: SessionType,
  cell: CodeCellType,
  diagnostics: string,
) => {
  const inlineSrcbook = encode(
    { cells: session.cells, language: session.language },
    { inline: true },
  );
  const cellSource = cell.source;
  const prompt = `==== BEGIN SRCBOOK ====
${inlineSrcbook}
==== END SRCBOOK ====

==== BEGIN CODE CELL ====
${cellSource}
==== END CODE CELL ====

==== BEGIN DIAGNOSTICS ====
${diagnostics}
==== END DIAGNOSTICS ====
`;
  return prompt;
};

const makeGenerateCellEditSystemPrompt = (language: CodeLanguageType) => {
  return readFileSync(Path.join(PROMPTS_DIR, `code-updater-${language}.txt`), 'utf-8');
};

const makeGenerateCellEditUserPrompt = (
  query: string,
  session: SessionType,
  cell: CodeCellType,
) => {
  // Intentionally not passing in tsconfig.json here as that doesn't need to be in the prompt.
  const inlineSrcbook = encode(
    { cells: session.cells, language: session.language },
    { inline: true },
  );

  const prompt = `==== BEGIN SRCBOOK ====
${inlineSrcbook}
==== END SRCBOOK ====

==== BEGIN CODE CELL ====
${cell.source}
==== END CODE CELL ====

==== BEGIN USER REQUEST ====
${query}
==== END USER REQUEST ====
`;
  return prompt;
};

type NoToolsGenerateTextResult = GenerateTextResult<{}>;
/*
 * Given a user request, which is free form text describing their intent,
 * generate a srcbook using an LLM.
 *
 * Currently, this uses openAI and the GPT-4o model, and throws if the
 * openAI API key is not set in the settings.
 * In the future, we can parameterize this with different models, to allow
 * users to use different providers like Anthropic or local ones.
 */
export async function generateSrcbook(query: string): Promise<NoToolsGenerateTextResult> {
  const model = await getModel();
  const result = await generateText({
    model,
    system: makeGenerateSrcbookSystemPrompt(),
    prompt: query,
  });

  // TODO, handle 'length' finish reason with sequencing logic.
  if (result.finishReason !== 'stop') {
    console.warn('Generated a srcbook, but finish_reason was not "stop":', result.finishReason);
  }
  return result;
}

export async function healthcheck(): Promise<string> {
  const model = await getModel();
  const result = await generateText({
    model,
    system: 'This is a test, simply respond "yes" to confirm the model is working.',
    prompt: 'Are you working?',
  });
  return result.text;
}

type GenerateCellsResult = {
  error: boolean;
  errors?: string[];
  cells?: CellType[];
};
export async function generateCells(
  query: string,
  session: SessionType,
  insertIdx: number,
): Promise<GenerateCellsResult> {
  const model = await getModel();

  const systemPrompt = makeGenerateCellSystemPrompt(session.language);
  const userPrompt = makeGenerateCellUserPrompt(session, insertIdx, query);
  const result = await generateText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
  });

  // TODO, handle 'length' finish reason with sequencing logic.
  if (result.finishReason !== 'stop') {
    console.warn('Generated a cell, but finish_reason was not "stop":', result.finishReason);
  }

  // Parse the result into cells
  // TODO: figure out logging.
  // Data is incredibly valuable for product improvements, but privacy needs to be considered.
  const decodeResult = decodeCells(result.text);

  if (decodeResult.error) {
    return { error: true, errors: decodeResult.errors };
  } else {
    return { error: false, cells: decodeResult.srcbook.cells };
  }
}

export async function generateCellEdit(query: string, session: SessionType, cell: CodeCellType) {
  const model = await getModel();

  const systemPrompt = makeGenerateCellEditSystemPrompt(session.language);
  const userPrompt = makeGenerateCellEditUserPrompt(query, session, cell);
  const result = await generateText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
  });

  return result.text;
}

export async function fixDiagnostics(
  session: SessionType,
  cell: CodeCellType,
  diagnostics: string,
): Promise<string> {
  const model = await getModel();

  const systemPrompt = makeFixDiagnosticsSystemPrompt();
  const userPrompt = makeFixDiagnosticsUserPrompt(session, cell, diagnostics);

  const result = await generateText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
  });

  return result.text;
}

export async function generateApp(
  projectId: string,
  files: FileContent[],
  query: string,
): Promise<string> {
  const model = await getModel();
  const result = await generateText({
    model,
    system: makeAppBuilderSystemPrompt(),
    prompt: makeAppCreateUserPrompt(projectId, files, query),
  });
  return result.text;
}

export async function streamEditApp(
  projectId: string,
  files: FileContent[],
  query: string,
  appId: string,
  planId: string,
) {
  const model = await getModel();

  const systemPrompt = makeAppEditorSystemPrompt();
  const userPrompt = makeAppEditorUserPrompt(projectId, files, query, '');

  let response = '';

  const result = await streamText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    onChunk: (chunk) => {
      if (chunk.chunk.type === 'text-delta') {
        response += chunk.chunk.textDelta;
      }
    },
    onFinish: () => {
      if (process.env.SRCBOOK_DISABLE_ANALYTICS !== 'true') {
        logAppGeneration({
          appId,
          planId,
          llm_request: { model, system: systemPrompt, prompt: userPrompt },
          llm_response: response,
        });
      }
    },
  });

  return result.textStream;
}

export async function streamEditAppSequential(
  projectId: string,
  files: FileContent[],
  query: string,
  appId: string,
  planId: string,
  mcpHub: typeof mcpHubInstance
) {
  console.log('[MCP] Using sequential logic for editing app', appId, 'plan:', planId);

  // 1. Call the MCP server to gather chain-of-thought or other specialized data.
  const serverName = 'sequential-thinking';
  const toolName = 'sequentialthinking'; 
  const toolParams = {
    thought: 'Analyze request from the user to see if we need more steps',
    nextThoughtNeeded: true,
    thoughtNumber: 1,
    totalThoughts: 2
  };

  let sequentialthinking = {};
  console.log('[MCP] Invoking tool:', toolName, 'on server:', serverName, 'with params:', toolParams);
  try {
    const result = await mcpHub.callTool(serverName, toolName, toolParams);
    console.log('[MCP] Tool invocation result:', JSON.stringify(result, null, 2));
    const textBlock = result.content?.[0]?.text ?? 'No content returned from sequentialthinking tool.';
    sequentialthinking = textBlock;
  } catch (error) {
    console.error(`[MCP] Error calling ${serverName} tool:`, error);
  }

  // 2. Build your systemPrompt, injecting chain-of-thought data from the MCP server:
  const basePrompt = makeAppEditorSystemPrompt();
  const systemPrompt = `You are a helpful AI that uses a sequential chain-of-thought approach. 
    Here is additional context from the sequential-thinking server:
    ${sequentialthinking}
    ${basePrompt}`;

  // 3. Construct your user prompt
  const userPrompt = makeAppEditorUserPrompt(projectId, files, query, sequentialthinking);

  let response = '';

  // 4. Continue with your usual streaming logic
  const result = await streamText({
    model: await getModel(),
    system: systemPrompt,
    prompt: userPrompt,
    onChunk: (chunk) => {
      if (chunk.chunk.type === 'text-delta') {
        response += chunk.chunk.textDelta;
        console.log('[MCP] Streaming response:', response);
      }
    },
    onFinish: async () => {
      if (process.env.SRCBOOK_DISABLE_ANALYTICS !== 'true') {
        logAppGeneration({
          appId,
          planId,
          llm_request: { model: await getModel(), system: systemPrompt, prompt: userPrompt },
          llm_response: response,
        });
      }
    },
  });

  // 5. Return the streaming body
  return result.textStream;
} 
