import { generateText, type GenerateTextResult } from 'ai';
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
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { PROMPTS_DIR } from '../constants.mjs';
import { encode, decodeCells } from '../srcmd.mjs';
import { getConfig } from '../config.mjs';

const makeGenerateSrcbookSystemPrompt = () => {
  return readFileSync(Path.join(PROMPTS_DIR, 'srcbook-generator.txt'), 'utf-8');
};

const makeGenerateCellSystemPrompt = (language: CodeLanguageType) => {
  return readFileSync(Path.join(PROMPTS_DIR, `cell-generator-${language}.txt`), 'utf-8');
};

const makeFixDiagnosticsSystemPrompt = () => {
  return readFileSync(Path.join(PROMPTS_DIR, 'fix-cell-diagnostics.txt'), 'utf-8');
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

/**
 * Get the correct client and model configuration.
 * Throws an error if the given API key is not set in the settings.
 */
async function getModel() {
  const config = await getConfig();
  const { model, provider } = config.aiConfig;
  switch (provider) {
    case 'openai':
      if (!config.openaiKey) {
        throw new Error('OpenAI API key is not set');
      }

      const openai = createOpenAI({
        compatibility: 'strict', // strict mode, enabled when using the OpenAI API
        apiKey: config.openaiKey,
      });

      return openai(model);
    case 'anthropic':
      if (!config.anthropicKey) {
        throw new Error('Anthropic API key is not set');
      }
      const anthropic = createAnthropic({
        apiKey: config.anthropicKey,
      });

      return anthropic(model);
  }
}

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
    model: model,
    system: makeGenerateSrcbookSystemPrompt(),
    prompt: query,
  });

  // TODO, handle 'length' finish reason with sequencing logic.
  if (result.finishReason !== 'stop') {
    console.warn('Generated a srcbook, but finish_reason was not "stop":', result.finishReason);
  }
  return result;
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
    model: model,
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
    model: model,
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
    model: model,
    system: systemPrompt,
    prompt: userPrompt,
  });

  return result.text;
}
