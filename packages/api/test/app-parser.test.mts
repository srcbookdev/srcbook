import { parseProjectXML } from '../ai/app-parser.mjs';

describe('parseProjectXML', () => {
  it('should correctly parse XML and return a Project object', () => {
    const testXML = `
    <project id="test-project">
      <file filename="./test1.txt">
        <![CDATA[Test content 1]]>
      </file>
      <file filename="./test2.txt">
        <![CDATA[Test content 2]]>
      </file>
      <command>
        <![CDATA[npm install]]>
      </command>
    </project>
    `;

    const result = parseProjectXML(testXML);

    const expectedResult = {
      id: 'test-project',
      items: [
        { type: 'file', filename: './test1.txt', content: 'Test content 1' },
        { type: 'file', filename: './test2.txt', content: 'Test content 2' },
        { type: 'command', content: 'npm install' },
      ],
    };

    expect(result).toEqual(expectedResult);
  });

  it('should throw an error for invalid XML', () => {
    const invalidXML = '<invalid>XML</invalid>';

    expect(() => parseProjectXML(invalidXML)).toThrow('Failed to parse XML response');
  });

  it('should throw an error for XML without a project tag', () => {
    const noProjectXML = '<root><file>Content</file></root>';

    expect(() => parseProjectXML(noProjectXML)).toThrow('Failed to parse XML response');
  });
});