export type NodeSchema = {
  isContentNode?: boolean;
  allowedChildren?: string[];
};

export const xmlSchema: Record<string, NodeSchema> = {
  plan: { isContentNode: false },
  action: { isContentNode: false },
  description: { isContentNode: true },
  file: { isContentNode: false },
  commandType: { isContentNode: true },
  package: { isContentNode: true },
  planDescription: { isContentNode: true },
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
    console.log('constructor called');
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
    console.log('handleOpenTag called');
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
      this.tagStack.push(this.currentTag);
      this.currentTag.children.push(newTag);
    }

    this.currentTag = newTag;
  }

  private handleCloseTag(tagName: string) {
    console.log('handleCloseTag called');
    if (!this.currentTag) return;

    // Save any remaining text content before closing
    if (this.textBuffer.trim()) {
      this.currentTag.content = this.textBuffer.trim();
    }
    this.textBuffer = '';

    if (this.currentTag.name === tagName) {
      // Clean the node based on schema before emitting
      this.currentTag = this.cleanNode(this.currentTag);
      this.onTag(this.currentTag);

      if (this.tagStack.length > 0) {
        this.currentTag = this.tagStack.pop()!;
      } else {
        this.currentTag = null;
      }
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
        this.buffer = cdataStart;
        this.cdataBuffer = '';
        continue;
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
