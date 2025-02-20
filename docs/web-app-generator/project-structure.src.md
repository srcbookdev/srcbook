<!-- srcbook:{"language":"typescript"} -->

# Project Structure in Web App Generator

This document explains how Srcbook's web app generator organizes generated applications.

## Base Structure

Generated apps follow a standard Vite + React structure:

###### base-structure.ts

```typescript
interface ProjectStructure {
  // Root configuration
  rootFiles: {
    'package.json': "Project dependencies and scripts";
    'tsconfig.json': "TypeScript configuration";
    'vite.config.ts': "Vite build configuration";
    'index.html': "Entry HTML file";
    '.gitignore': "Git ignore patterns";
    'README.md': "Project documentation";
  };

  // Source organization
  src: {
    'main.tsx': "Application entry point";
    'App.tsx': "Root component";
    'vite-env.d.ts': "Vite type declarations";
  };

  // Asset organization
  public: {
    assets: "Static assets";
    favicon: "Site favicon";
  };
}
```

## Component Organization

Components are organized by feature and type:

###### component-structure.ts

```typescript
interface ComponentStructure {
  // Component types
  components: {
    pages: "Top-level page components";
    features: "Feature-specific components";
    shared: "Reusable components";
    layout: "Layout components";
  };

  // Example structure
  exampleTree: {
    src: {
      components: {
        pages: {
          'HomePage.tsx': "Home page component",
          'AboutPage.tsx': "About page component"
        },
        features: {
          auth: {
            'LoginForm.tsx': "Login form component",
            'AuthContext.tsx': "Auth context provider"
          },
          todos: {
            'TodoList.tsx': "Todo list component",
            'TodoItem.tsx': "Individual todo item"
          }
        },
        shared: {
          'Button.tsx': "Reusable button component",
          'Input.tsx': "Reusable input component"
        },
        layout: {
          'Header.tsx': "Site header component",
          'Footer.tsx': "Site footer component"
        }
      }
    }
  };
}
```

## State Management

State management follows a consistent pattern:

###### state-structure.ts

```typescript
interface StateStructure {
  // State organization
  state: {
    context: "React Context providers";
    hooks: "Custom React hooks";
    stores: "State stores (if using)";
  };

  // Example implementation
  example: {
    src: {
      state: {
        context: {
          'ThemeContext.tsx': "Theme context provider",
          'UserContext.tsx': "User context provider"
        },
        hooks: {
          'useLocalStorage.ts': "Local storage hook",
          'useTheme.ts': "Theme hook",
          'useUser.ts': "User hook"
        },
        stores: {
          'todoStore.ts': "Todo state management",
          'settingsStore.ts': "App settings store"
        }
      }
    }
  };
}
```

## Styling Organization

Styles are organized using Tailwind with custom extensions:

###### style-structure.ts

```typescript
interface StyleStructure {
  // Style organization
  styles: {
    base: "Base styles and Tailwind config";
    components: "Component-specific styles";
    utilities: "Custom utility classes";
  };

  // Example structure
  example: {
    src: {
      styles: {
        'index.css': "Main stylesheet",
        'tailwind.css': "Tailwind imports"
      },
      components: {
        'Button.css': "Button component styles",
        'Card.css': "Card component styles"
      }
    },
    'tailwind.config.js': "Tailwind configuration",
    'postcss.config.js': "PostCSS configuration"
  };
}
```

## Type Definitions

TypeScript types are organized by domain:

###### type-structure.ts

```typescript
interface TypeStructure {
  // Type organization
  types: {
    models: "Data model types";
    api: "API related types";
    components: "Component prop types";
    utils: "Utility types";
  };

  // Example structure
  example: {
    src: {
      types: {
        models: {
          'user.ts': "User related types",
          'todo.ts': "Todo related types"
        },
        api: {
          'requests.ts': "API request types",
          'responses.ts': "API response types"
        },
        components: {
          'props.ts': "Component prop types",
          'events.ts': "Event handler types"
        },
        utils: {
          'common.ts': "Common utility types",
          'helpers.ts': "Helper type utilities"
        }
      }
    }
  };
}
```

## Configuration Files

Standard configuration files are included:

###### config-structure.ts

```typescript
interface ConfigStructure {
  // Configuration files
  config: {
    typescript: {
      'tsconfig.json': "TypeScript configuration",
      'tsconfig.node.json': "Node-specific TS config"
    },
    vite: {
      'vite.config.ts': "Vite configuration",
      'env.d.ts': "Environment variables"
    },
    styling: {
      'tailwind.config.js': "Tailwind configuration",
      'postcss.config.js': "PostCSS configuration"
    },
    testing: {
      'vitest.config.ts': "Vitest configuration",
      'setupTests.ts': "Test setup file"
    }
  };
}
```

## Usage Example

Here's how a generated app might look:

```bash
my-app/
├── src/
│   ├── components/
│   │   ├── pages/
│   │   ├── features/
│   │   ├── shared/
│   │   └── layout/
│   ├── state/
│   │   ├── context/
│   │   ├── hooks/
│   │   └── stores/
│   ├── styles/
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

## Next Steps

- Learn about [File System](./file-system.src.md)
- Explore [Package Management](./package-management.src.md)
- Study [Examples](./examples.src.md)