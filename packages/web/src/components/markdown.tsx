// Note redoing md rendering to have a stream variant and to do
// direct tw applications instead of cascading styles

import { marked } from 'marked';

// currently only handling styles will move to some nice stream
// processing bells and whistles around hiding incomplete links
// prestyling code blocks, syntax highlighting, and more
function postprocess(html: string): string {
  const styled = html
    .replace(/<p>/g, `<p class="text-primary">`)
    .replace(/<a/g, `<a class="text-primary underline"`)
    .replace(/<h1>/g, `<h1 class="text-lg py-4">`)
    .replace(/<h2>/g, `<h2 class="text-lg py-3">`)
    .replace(/<h3>/g, `<h3 class="text-base py-2">`)
    .replace(/<h4>/g, `<h4 class="text-base py-2">`)
    .replace(/<h5>/g, `<h5 class="text-sm py-1">`)
    .replace(/<h6>/g, `<h6 class="text-sm py-1">`)
    // TODO: syntax highlighting on code blocks
    .replace(/<blockquote>/g, `<blockquote class="bg-sb-core-40 rounded-md">`)
    .replace(/<ul>/g, `<ul class="pl-2 my-0">`)
    .replace(/<ol>/g, `<ol class="pl-4 my-0 list-decimal">`)
    .replace(/<code>/g, `<code class="rounded-sm bg-sb-core-20 p-1 text-xs">`);

  return styled;
}

export function Markdown({
  children,
  ...props
}: {
  children: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>): React.JSX.Element {
  marked.use({ async: false, hooks: { postprocess } });

  return (
    <div
      className={
        props.className !== undefined
          ? props.className
          : 'flex-none whitespace-pre-wrap px-2 py-2 text-sm'
      }
      {...props}
      dangerouslySetInnerHTML={{
        __html: marked.parse(children),
      }}
    />
  );
}
