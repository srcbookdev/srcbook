import path from 'node:path';
import protobuf from 'protobufjs';
import Long from 'long';
import { type CodiumCompletionResult } from "@srcbook/shared";

// NOTE: this EDITOR_API_KEY value was just included as a raw string in
// @codeium/react-code-editor. This seems to not be a secret?
const EDITOR_API_KEY = 'd49954eb-cfba-4992-980f-d8fb37f0e942';
const LANGUAGE_SERVER_PROTO_FILE_PATH = path.join(__dirname, "language_server.proto");

export async function runCodiumAiAutocomplete(
  apiKey: string | null,
  source: string,
  cursorOffset: number,
): Promise<CodiumCompletionResult> {
  const protos = await protobuf.load(LANGUAGE_SERVER_PROTO_FILE_PATH)
  const GetCompletionsRequest = protos.lookupType("GetCompletionsRequest");
  const Metadata = protos.lookupType("Metadata");
  const DocumentInfo = protos.lookupType("Document");
  const EditorOptions = protos.lookupType("EditorOptions");
  const Language = protos.lookupEnum("Language");
  const GetCompletionsResponse = protos.lookupType("GetCompletionsResponse");

  const sessionId = `react-editor-${crypto.randomUUID()}`;
  const apiKey = apiKey ?? EDITOR_API_KEY;

  const payload = {
    otherDocuments: [],
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
      editorLanguage: 'javascript',
      language: Language.getOption("JAVASCRIPT"),
      cursorOffset: Long.fromValue(cursorOffset),
      lineEnding: '\n',
    }),
    editorOptions: EditorOptions.create({
      tabSize: Long.fromValue(4),
      insertSpaces: true
    }),
  };

  // const verified = GetCompletionsRequest.verify(payload);
  // console.log('VERIFIED?', verified);

  // console.log('REQUEST:', payload);

  const requestData = GetCompletionsRequest.create(payload);
  const buffer = GetCompletionsRequest.encode(requestData).finish();

  const response = await fetch('https://web-backend.codeium.com/exa.language_server_pb.LanguageServerService/GetCompletions', {
    method: 'POST',
    body: buffer,
    headers: {
      'Connect-Protocol-Version': '1',
      'Content-Type': 'application/proto',
      Authorization: `Basic ${apiKey}-${sessionId}`,
    },
  });
  // console.log('RESPONSE:', response.status);

  const responseBodyBytes = new Uint8Array(await response.arrayBuffer());
  const responseBody = GetCompletionsResponse.decode(responseBodyBytes);

  // console.log('RESPONSE COMPLETIONS:');
  // for (const item of responseBody.completionItems) {
  //   console.log(item.completion.text);
  // }

  return responseBody;
}
