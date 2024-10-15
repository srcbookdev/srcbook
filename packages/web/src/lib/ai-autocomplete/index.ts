import protobuf from 'protobufjs';
import Long from 'long';

import { CodeCellType } from '@srcbook/shared';
import languageServerProto from './language-server-proto';

// NOTE: this EDITOR_API_KEY value was just included as a raw string in
// @codeium/react-code-editor. This seems to not be a secret? See here:
// https://github.com/Exafunction/codeium-react-code-editor/blob/768e1b231c00e078c86bc19c8ede697a1e37ec75/src/components/CodeiumEditor/CompletionProvider.ts#L48
const EDITOR_API_KEY = 'd49954eb-cfba-4992-980f-d8fb37f0e942';

// NOTE: The below logic has been adapted from codeium's `@codeium/react-code-editor package. See here:
// https://github.com/Exafunction/codeium-react-code-editor/blob/768e1b231c00e078c86bc19c8ede697a1e37ec75/src/components/CodeiumEditor/CompletionProvider.ts#L147-L159
export async function runCodeiumAiAutocomplete(
  optionalApiKey: string | null,
  source: string,
  sourceLanguage: 'javascript' | 'typescript',
  cursorOffset: number,
  otherCodeCells: Array<CodeCellType> = [],
): Promise<CodiumCompletionResult> {
  const protos = protobuf.Root.fromJSON(languageServerProto as protobuf.INamespace);
  const GetCompletionsRequest = protos.lookupType('exa.language_server_pb.GetCompletionsRequest');
  const Metadata = protos.lookupType('exa.codeium_common_pb.Metadata');
  const DocumentInfo = protos.lookupType('exa.language_server_pb.Document');
  const EditorOptions = protos.lookupType('exa.codeium_common_pb.EditorOptions');
  const Language = protos.lookupEnum('exa.codeium_common_pb.Language');
  const GetCompletionsResponse = protos.lookupType('exa.language_server_pb.GetCompletionsResponse');

  const sessionId = `react-editor-${crypto.randomUUID()}`;
  const apiKey = optionalApiKey ?? EDITOR_API_KEY;

  const payload = {
    otherDocuments: otherCodeCells.map((otherCodeCell) =>
      DocumentInfo.create({
        absolutePath: otherCodeCell.filename,
        relativePath: otherCodeCell.filename,
        text: otherCodeCell.source,
        editorLanguage: sourceLanguage,
        language: Language.getOption(sourceLanguage === 'javascript' ? 'JAVASCRIPT' : 'TYPESCRIPT'),
        cursorOffset: Long.fromValue(0), // NOTE: how do I represent the cursor not being in here?
        lineEnding: '\n',
      }),
    ),
    metadata: Metadata.create({
      ideName: 'web',
      extensionVersion: '1.0.12',
      apiKey,
      ideVersion: 'unknown',
      extensionName: '@codeium/react-code-editor',
      sessionId,
    }),
    document: DocumentInfo.create({
      text: source,
      editorLanguage: sourceLanguage,
      language: Language.getOption(sourceLanguage === 'javascript' ? 'JAVASCRIPT' : 'TYPESCRIPT'),
      cursorOffset: Long.fromValue(cursorOffset),
      lineEnding: '\n',
    }),
    editorOptions: EditorOptions.create({
      tabSize: Long.fromValue(4),
      insertSpaces: true,
    }),
  };

  const requestData = GetCompletionsRequest.create(payload);
  const buffer = GetCompletionsRequest.encode(requestData).finish();

  const response = await fetch(
    'https://web-backend.codeium.com/exa.language_server_pb.LanguageServerService/GetCompletions',
    {
      method: 'POST',
      body: buffer,
      headers: {
        'Connect-Protocol-Version': '1',
        'Content-Type': 'application/proto',
        Authorization: `Basic ${apiKey}-${sessionId}`,
      },
    },
  );

  const responseBodyBytes = new Uint8Array(await response.arrayBuffer());
  const responseBody = GetCompletionsResponse.decode(responseBodyBytes);

  return responseBody.toJSON() as CodiumCompletionResult;
}

type CodiumCompletionItem = {
  completion: {
    completionId: string;
    text: string;
    prefix: string;
    stop: string;
    score: number;
    tokens: Array<string>;
    decoded_tokens: Array<string>;
    probabilities: Array<number>;
    adjustedProbabilities: Array<number>;
    generatedLength: string;
  };
  completionParts: Array<{
    text: string;
    offset: string;
    prefix: string;
    type:
      | 'COMPLETION_PART_TYPE_UNSPECIFIED'
      // Single-line completion parts that appear within an existing line of text.
      | 'COMPLETION_PART_TYPE_INLINE'
      // Possibly multi-line completion parts that appear below an existing line of text.
      | 'COMPLETION_PART_TYPE_BLOCK'
      // Like COMPLETION_PART_TYPE_INLINE, but overwrites the existing text.
      | 'COMPLETION_PART_TYPE_INLINE_MASK';
  }>;
  range: {
    endOffset: string;
    endPosition: { row?: string; col?: string };
    startPosition: { row?: string; col?: string };
  };
};

type CodiumCompletionResult = {
  completionItems?: Array<CodiumCompletionItem>;
  state: {
    state:
      | 'CODEIUM_STATE_UNSPECIFIED'
      | 'CODEIUM_STATE_INACTIVE'
      | 'CODEIUM_STATE_PROCESSING'
      | 'CODEIUM_STATE_SUCCESS'
      | 'CODEIUM_STATE_WARNING'
      | 'CODEIUM_STATE_ERROR';
    status: string;
  };
};
