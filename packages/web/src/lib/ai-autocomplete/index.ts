import protobuf from 'protobufjs';
import Long from 'long';
import { type CodiumCompletionResult } from "@srcbook/shared";

import languageServerProto from "./language-server-proto";

// NOTE: this EDITOR_API_KEY value was just included as a raw string in
// @codeium/react-code-editor. This seems to not be a secret?
const EDITOR_API_KEY = 'd49954eb-cfba-4992-980f-d8fb37f0e942';

export async function runCodiumAiAutocomplete(
  optionalApiKey: string | null,
  source: string,
  cursorOffset: number,
): Promise<CodiumCompletionResult> {
  const protos = protobuf.Root.fromJSON(languageServerProto as protobuf.INamespace);
  const GetCompletionsRequest = protos.lookupType("exa.language_server_pb.GetCompletionsRequest");
  const Metadata = protos.lookupType("exa.codeium_common_pb.Metadata");
  const DocumentInfo = protos.lookupType("exa.language_server_pb.Document");
  const EditorOptions = protos.lookupType("exa.codeium_common_pb.EditorOptions");
  const Language = protos.lookupEnum("exa.codeium_common_pb.Language");
  const GetCompletionsResponse = protos.lookupType("exa.language_server_pb.GetCompletionsResponse");

  const sessionId = `react-editor-${crypto.randomUUID()}`;
  const apiKey = optionalApiKey ?? EDITOR_API_KEY;

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

  return responseBody.toJSON();
}
