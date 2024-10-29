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

    if (this.currentTag.name === tagName) {
      this.onTag(this.currentTag);

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
        const cdataEndIndex = this.cdataBuffer.indexOf(']]>');
        if (cdataEndIndex === -1) {
          this.cdataBuffer += chunk;
          return;
        }

        this.cdataBuffer = this.cdataBuffer.substring(0, cdataEndIndex);
        if (this.currentTag) {
          this.currentTag.content = this.cdataBuffer;
        }
        this.isInCDATA = false;
        this.cdataBuffer = '';
        this.buffer = this.buffer.substring(cdataEndIndex + 3);
        continue;
      }

      // Start of an opening tag?
      const openTagStartIdx = this.buffer.indexOf('<');
      if (openTagStartIdx === -1) {
        this.buffer = '';
        return;
      }

      // If this opening tag is CDATA, handle it differently than XML tags
      if (this.sequenceExistsAt('<![CDATA[', openTagStartIdx)) {
        this.isInCDATA = true;
        const cdataStart = this.buffer.substring(openTagStartIdx + 9);
        this.buffer = cdataStart;
        this.cdataBuffer = cdataStart;
        return;
      }

      const openTagEndIdx = this.buffer.indexOf('>', openTagStartIdx);
      if (openTagEndIdx === -1) {
        return;
      }

      const tagContent = this.buffer.substring(openTagStartIdx + 1, openTagEndIdx);
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

  /**
   * Does the sequence exist starting at the given index in the buffer?
   */
  private sequenceExistsAt(sequence: string, idx: number, buffer: string = this.buffer) {
    for (let i = 0; i < sequence.length; i++) {
      if (buffer[idx + i] !== sequence[i]) {
        return false;
      }
    }

    return true;
  }
}
