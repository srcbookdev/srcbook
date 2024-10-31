export type NodeSchema = {
  isContentNode?: boolean;
  hasCdata?: boolean;
  allowedChildren?: string[];
};

export const xmlSchema: Record<string, NodeSchema> = {
  plan: { isContentNode: false, hasCdata: false },
  action: { isContentNode: false, hasCdata: false },
  description: { isContentNode: true, hasCdata: true },
  file: { isContentNode: false, hasCdata: true },
  commandType: { isContentNode: true, hasCdata: false },
  package: { isContentNode: true, hasCdata: false },
  planDescription: { isContentNode: true, hasCdata: true },
};

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
  private textBuffer = '';
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
    // First, save any accumulated text content to the current tag
    if (this.currentTag && this.textBuffer.trim()) {
      this.currentTag.content = this.textBuffer.trim();
    }
    this.textBuffer = '';

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
      // Push current tag to stack before moving to new tag
      this.tagStack.push(this.currentTag);
      this.currentTag.children.push(newTag);
    }

    this.currentTag = newTag;
  }

  private handleCloseTag(tagName: string) {
    if (!this.currentTag) {
      console.warn('Attempted to handle close tag with no current tag');
      return;
    }

    // Save any remaining text content before closing
    // Don't overwrite CDATA content, it's already been written
    const schema = xmlSchema[this.currentTag.name];
    const isCdataNode = schema ? schema.hasCdata : false;
    if (!isCdataNode) {
      this.currentTag.content = this.textBuffer.trim();
    }
    this.textBuffer = '';

    if (this.currentTag.name !== tagName) {
      return;
    }

    // Clean and emit the completed tag
    this.currentTag = this.cleanNode(this.currentTag);
    this.onTag(this.currentTag);

    // Pop the parent tag from the stack
    if (this.tagStack.length > 0) {
      this.currentTag = this.tagStack.pop()!;
    } else {
      this.currentTag = null;
    }
  }

  private cleanNode(node: TagType): TagType {
    const schema = xmlSchema[node.name];

    // If it's not in the schema, default to treating it as a content node
    const isContentNode = schema ? schema.isContentNode : true;

    // If it's not a content node and has children, remove its content
    if (!isContentNode && node.children.length > 0) {
      node.content = '';
    }

    // Recursively clean children
    node.children = node.children.map((child) => this.cleanNode(child));

    return node;
  }

  parse(chunk: string) {
    this.buffer += chunk;

    while (this.buffer.length > 0) {
      // Handle CDATA sections
      if (this.isInCDATA) {
        const cdataEndIndex = this.cdataBuffer.indexOf(']]>');
        if (cdataEndIndex === -1) {
          this.cdataBuffer += this.buffer;
          // Sometimes ]]> is in the next chunk, and we don't want to lose what's behind it
          const nextCdataEnd = this.cdataBuffer.indexOf(']]>');
          if (nextCdataEnd !== -1) {
            this.buffer = this.cdataBuffer.substring(nextCdataEnd);
          } else {
            this.buffer = '';
          }
          return;
        }

        this.cdataBuffer = this.cdataBuffer.substring(0, cdataEndIndex);
        if (this.currentTag) {
          this.currentTag.content = this.cdataBuffer.trim();
        }
        this.isInCDATA = false;
        this.buffer = this.cdataBuffer.substring(cdataEndIndex + 3) + this.buffer;
        this.cdataBuffer = '';
        continue;
      }

      // Look for the next tag
      const openTagStartIdx = this.buffer.indexOf('<');
      if (openTagStartIdx === -1) {
        // No more tags in this chunk, save the rest as potential content
        this.textBuffer += this.buffer;
        this.buffer = '';
        return;
      }

      // Save any text content before this tag
      if (openTagStartIdx > 0) {
        this.textBuffer += this.buffer.substring(0, openTagStartIdx);
        this.buffer = this.buffer.substring(openTagStartIdx);
      }

      // Check for CDATA
      if (this.sequenceExistsAt('<![CDATA[', 0)) {
        this.isInCDATA = true;
        const cdataStart = this.buffer.substring(9);
        this.cdataBuffer = cdataStart;
        this.buffer = '';
        return;
      }

      const openTagEndIdx = this.buffer.indexOf('>');
      if (openTagEndIdx === -1) {
        return;
      }

      const tagContent = this.buffer.substring(1, openTagEndIdx);
      this.buffer = this.buffer.substring(openTagEndIdx + 1);

      if (tagContent.startsWith('/')) {
        // Closing tag
        this.handleCloseTag(tagContent.substring(1));
      } else {
        // Opening tag
        this.handleOpenTag(tagContent);
      }
    }
  }

  private sequenceExistsAt(sequence: string, idx: number, buffer: string = this.buffer) {
    for (let i = 0; i < sequence.length; i++) {
      if (buffer[idx + i] !== sequence[i]) {
        return false;
      }
    }
    return true;
  }
}
