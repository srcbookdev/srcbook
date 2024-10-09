export default {
  options: {
    syntax: 'proto3',
  },
  nested: {
    exa: {
      nested: {
        language_server_pb: {
          options: {
            go_package: 'github.com/Exafunction/Exafunction/exa/language_server_pb',
          },
          nested: {
            LanguageServerService: {
              methods: {
                GetCompletions: {
                  requestType: 'GetCompletionsRequest',
                  responseType: 'GetCompletionsResponse',
                },
                AcceptCompletion: {
                  requestType: 'AcceptCompletionRequest',
                  responseType: 'AcceptCompletionResponse',
                },
                GetAuthToken: {
                  requestType: 'GetAuthTokenRequest',
                  responseType: 'GetAuthTokenResponse',
                },
              },
            },
            MultilineConfig: {
              fields: {
                threshold: {
                  type: 'float',
                  id: 1,
                },
              },
            },
            GetCompletionsRequest: {
              fields: {
                metadata: {
                  type: 'codeium_common_pb.Metadata',
                  id: 1,
                },
                document: {
                  type: 'Document',
                  id: 2,
                },
                editorOptions: {
                  type: 'codeium_common_pb.EditorOptions',
                  id: 3,
                },
                otherDocuments: {
                  rule: 'repeated',
                  type: 'Document',
                  id: 5,
                },
                experimentConfig: {
                  type: 'ExperimentConfig',
                  id: 7,
                },
                modelName: {
                  type: 'string',
                  id: 10,
                },
                multilineConfig: {
                  type: 'MultilineConfig',
                  id: 13,
                },
              },
            },
            GetCompletionsResponse: {
              fields: {
                state: {
                  type: 'State',
                  id: 1,
                },
                completionItems: {
                  rule: 'repeated',
                  type: 'CompletionItem',
                  id: 2,
                },
              },
            },
            AcceptCompletionRequest: {
              fields: {
                metadata: {
                  type: 'codeium_common_pb.Metadata',
                  id: 1,
                },
                completionId: {
                  type: 'string',
                  id: 2,
                },
              },
            },
            AcceptCompletionResponse: {
              fields: {},
            },
            GetAuthTokenRequest: {
              fields: {},
            },
            GetAuthTokenResponse: {
              fields: {
                authToken: {
                  type: 'string',
                  id: 1,
                },
                uuid: {
                  type: 'string',
                  id: 2,
                },
              },
            },
            DocumentPosition: {
              fields: {
                row: {
                  type: 'uint64',
                  id: 1,
                },
                col: {
                  type: 'uint64',
                  id: 2,
                },
              },
            },
            Document: {
              fields: {
                absolutePath: {
                  type: 'string',
                  id: 1,
                },
                relativePath: {
                  type: 'string',
                  id: 2,
                },
                text: {
                  type: 'string',
                  id: 3,
                },
                editorLanguage: {
                  type: 'string',
                  id: 4,
                },
                language: {
                  type: 'codeium_common_pb.Language',
                  id: 5,
                },
                cursorOffset: {
                  type: 'uint64',
                  id: 6,
                },
                cursorPosition: {
                  type: 'DocumentPosition',
                  id: 8,
                },
                lineEnding: {
                  type: 'string',
                  id: 7,
                },
              },
            },
            ExperimentConfig: {
              fields: {
                forceEnableExperiments: {
                  rule: 'repeated',
                  type: 'codeium_common_pb.ExperimentKey',
                  id: 1,
                },
              },
            },
            CodeiumState: {
              values: {
                CODEIUM_STATE_UNSPECIFIED: 0,
                CODEIUM_STATE_INACTIVE: 1,
                CODEIUM_STATE_PROCESSING: 2,
                CODEIUM_STATE_SUCCESS: 3,
                CODEIUM_STATE_WARNING: 4,
                CODEIUM_STATE_ERROR: 5,
              },
            },
            State: {
              fields: {
                state: {
                  type: 'CodeiumState',
                  id: 1,
                },
                message: {
                  type: 'string',
                  id: 2,
                },
              },
            },
            LineType: {
              values: {
                LINE_TYPE_UNSPECIFIED: 0,
                LINE_TYPE_SINGLE: 1,
                LINE_TYPE_MULTI: 2,
              },
            },
            Range: {
              fields: {
                startOffset: {
                  type: 'uint64',
                  id: 1,
                },
                endOffset: {
                  type: 'uint64',
                  id: 2,
                },
                startPosition: {
                  type: 'DocumentPosition',
                  id: 3,
                },
                endPosition: {
                  type: 'DocumentPosition',
                  id: 4,
                },
              },
            },
            Suffix: {
              fields: {
                text: {
                  type: 'string',
                  id: 1,
                },
                deltaCursorOffset: {
                  type: 'int64',
                  id: 2,
                },
              },
            },
            CompletionPartType: {
              values: {
                COMPLETION_PART_TYPE_UNSPECIFIED: 0,
                COMPLETION_PART_TYPE_INLINE: 1,
                COMPLETION_PART_TYPE_BLOCK: 2,
                COMPLETION_PART_TYPE_INLINE_MASK: 3,
              },
            },
            CompletionPart: {
              fields: {
                text: {
                  type: 'string',
                  id: 1,
                },
                offset: {
                  type: 'uint64',
                  id: 2,
                },
                type: {
                  type: 'CompletionPartType',
                  id: 3,
                },
                prefix: {
                  type: 'string',
                  id: 4,
                },
                line: {
                  type: 'uint64',
                  id: 5,
                },
              },
            },
            CompletionItem: {
              fields: {
                completion: {
                  type: 'codeium_common_pb.Completion',
                  id: 1,
                },
                suffix: {
                  type: 'Suffix',
                  id: 5,
                },
                range: {
                  type: 'Range',
                  id: 2,
                },
                source: {
                  type: 'codeium_common_pb.CompletionSource',
                  id: 3,
                },
                completionParts: {
                  rule: 'repeated',
                  type: 'CompletionPart',
                  id: 8,
                },
              },
            },
          },
        },
        codeium_common_pb: {
          options: {
            go_package: 'github.com/Exafunction/Exafunction/exa/codeium_common_pb',
          },
          nested: {
            ExperimentKey: {
              values: {
                UNSPECIFIED: 0,
                JUPYTER_FORMAT: 77,
              },
            },
            Completion: {
              fields: {
                completionId: {
                  type: 'string',
                  id: 1,
                },
                text: {
                  type: 'string',
                  id: 2,
                },
                prefix: {
                  type: 'string',
                  id: 3,
                },
                stop: {
                  type: 'string',
                  id: 4,
                },
                score: {
                  type: 'double',
                  id: 5,
                },
                tokens: {
                  rule: 'repeated',
                  type: 'uint64',
                  id: 6,
                },
                decodedTokens: {
                  rule: 'repeated',
                  type: 'string',
                  id: 7,
                },
                probabilities: {
                  rule: 'repeated',
                  type: 'double',
                  id: 8,
                },
                adjustedProbabilities: {
                  rule: 'repeated',
                  type: 'double',
                  id: 9,
                },
                generatedLength: {
                  type: 'uint64',
                  id: 10,
                },
              },
            },
            AuthSource: {
              values: {
                AUTH_SOURCE_CODEIUM: 0,
              },
            },
            Metadata: {
              fields: {
                ideName: {
                  type: 'string',
                  id: 1,
                },
                ideVersion: {
                  type: 'string',
                  id: 7,
                },
                extensionName: {
                  type: 'string',
                  id: 12,
                },
                extensionVersion: {
                  type: 'string',
                  id: 2,
                },
                apiKey: {
                  type: 'string',
                  id: 3,
                },
                locale: {
                  type: 'string',
                  id: 4,
                },
                sessionId: {
                  type: 'string',
                  id: 10,
                },
                requestId: {
                  type: 'uint64',
                  id: 9,
                },
                userAgent: {
                  type: 'string',
                  id: 13,
                },
                url: {
                  type: 'string',
                  id: 14,
                },
                authSource: {
                  type: 'AuthSource',
                  id: 15,
                },
              },
            },
            EditorOptions: {
              fields: {
                tabSize: {
                  type: 'uint64',
                  id: 1,
                },
                insertSpaces: {
                  type: 'bool',
                  id: 2,
                },
              },
            },
            Event: {
              fields: {
                eventType: {
                  type: 'EventType',
                  id: 1,
                },
                eventJson: {
                  type: 'string',
                  id: 2,
                },
                timestampUnixMs: {
                  type: 'int64',
                  id: 3,
                },
              },
            },
            EventType: {
              values: {
                EVENT_TYPE_UNSPECIFIED: 0,
                EVENT_TYPE_ENABLE_CODEIUM: 1,
                EVENT_TYPE_DISABLE_CODEIUM: 2,
                EVENT_TYPE_SHOW_PREVIOUS_COMPLETION: 3,
                EVENT_TYPE_SHOW_NEXT_COMPLETION: 4,
              },
            },
            CompletionSource: {
              values: {
                COMPLETION_SOURCE_UNSPECIFIED: 0,
                COMPLETION_SOURCE_TYPING_AS_SUGGESTED: 1,
                COMPLETION_SOURCE_CACHE: 2,
                COMPLETION_SOURCE_NETWORK: 3,
              },
            },
            Language: {
              values: {
                LANGUAGE_UNSPECIFIED: 0,
                LANGUAGE_C: 1,
                LANGUAGE_CLOJURE: 2,
                LANGUAGE_COFFEESCRIPT: 3,
                LANGUAGE_CPP: 4,
                LANGUAGE_CSHARP: 5,
                LANGUAGE_CSS: 6,
                LANGUAGE_CUDACPP: 7,
                LANGUAGE_DOCKERFILE: 8,
                LANGUAGE_GO: 9,
                LANGUAGE_GROOVY: 10,
                LANGUAGE_HANDLEBARS: 11,
                LANGUAGE_HASKELL: 12,
                LANGUAGE_HCL: 13,
                LANGUAGE_HTML: 14,
                LANGUAGE_INI: 15,
                LANGUAGE_JAVA: 16,
                LANGUAGE_JAVASCRIPT: 17,
                LANGUAGE_JSON: 18,
                LANGUAGE_JULIA: 19,
                LANGUAGE_KOTLIN: 20,
                LANGUAGE_LATEX: 21,
                LANGUAGE_LESS: 22,
                LANGUAGE_LUA: 23,
                LANGUAGE_MAKEFILE: 24,
                LANGUAGE_MARKDOWN: 25,
                LANGUAGE_OBJECTIVEC: 26,
                LANGUAGE_OBJECTIVECPP: 27,
                LANGUAGE_PERL: 28,
                LANGUAGE_PHP: 29,
                LANGUAGE_PLAINTEXT: 30,
                LANGUAGE_PROTOBUF: 31,
                LANGUAGE_PBTXT: 32,
                LANGUAGE_PYTHON: 33,
                LANGUAGE_R: 34,
                LANGUAGE_RUBY: 35,
                LANGUAGE_RUST: 36,
                LANGUAGE_SASS: 37,
                LANGUAGE_SCALA: 38,
                LANGUAGE_SCSS: 39,
                LANGUAGE_SHELL: 40,
                LANGUAGE_SQL: 41,
                LANGUAGE_STARLARK: 42,
                LANGUAGE_SWIFT: 43,
                LANGUAGE_TSX: 44,
                LANGUAGE_TYPESCRIPT: 45,
                LANGUAGE_VISUALBASIC: 46,
                LANGUAGE_VUE: 47,
                LANGUAGE_XML: 48,
                LANGUAGE_XSL: 49,
                LANGUAGE_YAML: 50,
                LANGUAGE_SVELTE: 51,
                LANGUAGE_TOML: 52,
                LANGUAGE_DART: 53,
                LANGUAGE_RST: 54,
                LANGUAGE_OCAML: 55,
                LANGUAGE_CMAKE: 56,
                LANGUAGE_PASCAL: 57,
                LANGUAGE_ELIXIR: 58,
                LANGUAGE_FSHARP: 59,
                LANGUAGE_LISP: 60,
                LANGUAGE_MATLAB: 61,
                LANGUAGE_POWERSHELL: 62,
                LANGUAGE_SOLIDITY: 63,
                LANGUAGE_ADA: 64,
                LANGUAGE_OCAML_INTERFACE: 65,
              },
            },
          },
        },
      },
    },
  },
};
