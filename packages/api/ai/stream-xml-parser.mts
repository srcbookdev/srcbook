export type TagType = {
  name: string;
  attributes: Record<string, string>;
  content: string;
  children: TagType[];
};

export type TagCallbackType = (tag: TagType) => void;

export class StreamingXMLParser {
  private buffer = '';
  private currentTag: TagType | null = null;
  private tagStack: TagType[] = [];
  private isInCDATA = false;
  private cdataBuffer = '';
  private onTag: TagCallbackType;

  constructor({ onTag }: { onTag: TagCallbackType }) {
    this.onTag = onTag;
  }

  private parseAttributes(attributeString: string): Record<string, string> {
    const attributes: Record<string, string> = {};
    const matches = attributeString.match(/(\w+)="([^"]*?)"/g);

    if (matches) {
      matches.forEach((match) => {
        const [key, value] = match.split('=') as [string, string];
        attributes[key] = value.replace(/"/g, '');
      });
    }

    return attributes;
  }

  private handleOpenTag(tagContent: string) {
    const spaceIndex = tagContent.indexOf(' ');
    const tagName = spaceIndex === -1 ? tagContent : tagContent.substring(0, spaceIndex);
    const attributeString = spaceIndex === -1 ? '' : tagContent.substring(spaceIndex + 1);

    const newTag: TagType = {
      name: tagName,
      attributes: this.parseAttributes(attributeString),
      content: '',
      children: [],
    };

    if (this.currentTag) {
      this.tagStack.push(this.currentTag);
      this.currentTag.children.push(newTag);
    }

    this.currentTag = newTag;
  }

  private handleCloseTag(tagName: string) {
    if (!this.currentTag) return;

    console.dir(this.tagStack, { depth: null });

    if (this.currentTag.name === tagName) {
      if (tagName === 'planDescription' || tagName === 'action') {
        this.onTag(this.currentTag);
      }

      if (this.tagStack.length > 0) {
        this.currentTag = this.tagStack.pop()!;
      } else {
        this.currentTag = null;
      }
    }
  }

  parse(chunk: string) {
    this.buffer += chunk;

    while (this.buffer.length > 0) {
      // Handle CDATA sections
      if (this.isInCDATA) {
        const cdataEndIndex = this.buffer.indexOf(']]>');
        if (cdataEndIndex === -1) {
          this.cdataBuffer += this.buffer;
          this.buffer = '';
          return;
        }

        this.cdataBuffer += this.buffer.substring(0, cdataEndIndex);
        if (this.currentTag) {
          this.currentTag.content = this.cdataBuffer;
        }
        this.isInCDATA = false;
        this.cdataBuffer = '';
        this.buffer = this.buffer.substring(cdataEndIndex + 3);
        continue;
      }

      // Look for CDATA start
      const cdataStartIndex = this.buffer.indexOf('<![CDATA[');
      if (cdataStartIndex !== -1) {
        this.isInCDATA = true;
        this.cdataBuffer = '';
        this.buffer = this.buffer.substring(cdataStartIndex + 9);
        continue;
      }

      // Handle regular XML tags
      const openTagStart = this.buffer.indexOf('<');
      if (openTagStart === -1) {
        this.buffer = '';
        return;
      }

      const openTagEnd = this.buffer.indexOf('>', openTagStart);
      if (openTagEnd === -1) {
        return;
      }

      const tagContent = this.buffer.substring(openTagStart + 1, openTagEnd);
      this.buffer = this.buffer.substring(openTagEnd + 1);

      if (tagContent.startsWith('/')) {
        // Closing tag
        this.handleCloseTag(tagContent.substring(1));
      } else {
        // Opening tag
        this.handleOpenTag(tagContent);
      }
    }
  }
}

type StackTagType = { type: 'open' | 'close'; start: number; end: number };

export class StreamingXMLParserAlt {
  private idx = 0;
  private buffer = '';
  private currentTag: TagType | null = null;
  // private tagStack: TagType[] = [];
  // private isInCDATA = false;
  // private cdataBuffer = '';
  private onTag: TagCallbackType;

  private stack: StackTagType[] = [
    {
      type: 'open',
      start: 0,
      end: -1,
    },
  ];

  constructor({ onTag }: { onTag: TagCallbackType }) {
    this.onTag = onTag;
  }

  parse(chunk: string) {
    this.buffer += chunk;

    let stop = false;

    while (!stop) {
      stop = this.doParse();
    }
  }

  private doParse() {
    if (this.lastTag.end === -1) {
      this.lastTag.end = this.buffer.indexOf('>', this.lastTag.start);

      if (this.lastTag.end !== -1 && this.lastTag.type === 'open') {
        const { name, attributes } = this.parseOpenTag(this.lastTag.start + 1, this.lastTag.end);
        this.currentTag = {
          name,
          attributes,
          content: '',
          children: [],
        };
        return this.lastTag.end + 1;
      } else if (this.lastTag.end !== -1 && this.lastTag.type === 'close') {
        this.emit(this.currentTag!);
        this.currentTag = null;
        this.idx = this.lastTag.end + 1;
      } else {
        return false;
      }
    } else {
      const openTag = this.buffer.indexOf('<', idx);

      if (!openTag) {
        const rest = this.buffer.substring(idx);
        if (/\S+/.test(rest)) {
          throw new Error(`Expected to find an opening tag but got ${rest}`);
        }
        return this.buffer.length;
      }

      this.stack.push({ type: 'open' });
    }
  }

  private emit(tag: TagType) {
    this.onTag(tag);
  }

  private get lastTag() {
    return this.stack[this.stack.length - 1] as StackTagType;
  }

  private parseOpenTag(startIdx: number, endIdx: number) {
    const tagContent = this.buffer.substring(startIdx, endIdx);
    const spaceIdx = tagContent.indexOf(' ');
    const name = tagContent.substring(0, spaceIdx);
    const attributeContent = tagContent.substring(spaceIdx + 1);
    const attributes: Record<string, string> = {};
    const matches = attributeContent.match(/(\w+)="([^"]*?)"/g);

    if (matches) {
      matches.forEach((match) => {
        const [key, value] = match.split('=') as [string, string];
        attributes[key] = value.replace(/"/g, '');
      });
    }

    return { name, attributes };
  }
}
