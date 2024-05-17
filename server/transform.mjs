import parser from '@babel/parser';
import traverseMod from '@babel/traverse';
import t from '@babel/types';
import generateMod from '@babel/generator';

const traverse = traverseMod.default;
const generate = generateMod.default;

/**
 * Transforms import statements to dynamic imports
 *
 * For example, the following import statement:
 *
 *     import foo, {bar as quux} from 'baz';
 *
 * would be rewritten as:
 *
 *     const {default: foo, bar: quux} = await import('baz');
 *
 */
export function transformImportStatements(source, filename) {
  const ast = parser.parse(source, {
    sourceType: 'module',
  });

  traverse(ast, {
    ImportDeclaration(path) {
      const { node } = path;
      const source = node.source;

      // Import specifiers are things like:
      //
      //     import foo, {bar, baz as quux} from 'foo';
      //                  ^^^^^^^^^^^^^^^^
      //
      // Here, `bar` and `baz` (which is renamed to `quux`) are named specifiers.
      //
      const specifiers = node.specifiers.filter(t.isImportSpecifier);

      // Default import specifiers are things like:
      //
      //     import foo, {bar, baz as quux} from 'foo';
      //            ^^^
      //
      // Here, `foo` is the default specifier.
      //
      const defaultSpecifier = node.specifiers.find(t.isImportDefaultSpecifier);

      // Namespace import specifiers are things like:
      //
      //     import * as foo from 'foo';
      //            ^^^^^^^^
      //
      // Here, we import all module properties under the "namespace" `foo`.
      //
      const namespaceSpecifier = node.specifiers.find(t.isImportNamespaceSpecifier);

      // Always create a new dynamic import for namespace imports, e.g.:
      //
      //     import * as foo from 'foo';
      //
      // becomes
      //
      //     const foo = await import('foo');
      //
      // which is unlike the other dynamic imports which will follow the destructuring syntax, like:
      //
      //     import foo, {bar as quux} from 'foo';
      //
      // becomes
      //
      //     const {default: foo, bar: quux} = await import('foo');
      //
      if (namespaceSpecifier) {
        const variableDeclaration = createDynamicImport(namespaceSpecifier, source);
        path.insertBefore(variableDeclaration);
      }

      // Right now we generate two dynamic imports when there is a namespace import
      // and at least one default or import specifier.
      //
      // For example:
      //
      //     import foo, * as allfoo from 'foo';
      //
      // becomes
      //
      //     const allfoo = await import('foo');
      //     const {default: foo} = await import('foo');
      //
      // TODO: reuse namespace import to destructure the other imports. For example, the above
      // should instead be:
      //
      //     const allfoo = await import('foo');
      //     const {default: foo} = allfoo;

      const properties = [];

      if (defaultSpecifier) {
        properties.push(t.objectProperty(t.identifier('default'), defaultSpecifier.local));
      }

      for (const specifier of specifiers) {
        properties.push(t.objectProperty(specifier.imported, specifier.local));
      }

      if (properties.length > 0) {
        path.insertBefore(createDestructuredDynamicImport(properties, source));
      }

      path.remove();
    },
  });

  const options = {
    filename: filename,
    sourceMap: true,
    retainLines: true,
  };

  return generate(ast, options, source);
}

function createDynamicImport(specifier, source) {
  const importExpression = t.awaitExpression(t.callExpression(t.import(), [source]));
  const variableDeclarator = t.variableDeclarator(specifier.local, importExpression);
  return t.variableDeclaration('const', [variableDeclarator]);
}

function createDestructuredDynamicImport(properties, source) {
  const importExpression = t.awaitExpression(t.callExpression(t.import(), [source]));
  const variableDeclarator = t.variableDeclarator(t.objectPattern(properties), importExpression);
  return t.variableDeclaration('const', [variableDeclarator]);
}
