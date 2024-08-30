import { useState } from 'react';
import { SessionChannel } from '@/clients/websocket';
import { SessionType } from '@/types';
import { BaseComponent } from '@srcbook/ui-sdk';
import Markdown from 'marked-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Props = {
  component: BaseComponent;
  // This is primitive. We'll need more complex return value types
  onUpdate: (value: string) => void;
};
const ComponentRenderer = ({ component, onUpdate }: Props) => {
  const [inputValue, setInputValue] = useState('');

  switch (component.type) {
    case 'INPUT_TEXT':
      return (
        <div>
          <label>{component.props.label}</label>
          <Input onChange={(e) => setInputValue(e.target.value)} />
          <Button onClick={() => onUpdate(inputValue)}>Submit</Button>
        </div>
      );
    case 'DISPLAY_MARKDOWN':
      return (
        <div className="sb-prose">
          <Markdown>{component.props.content}</Markdown>
        </div>
      );
    default:
      return <div>Unknown component type: {component.type}</div>;
  }
};

export const UIApp = ({
  component,
  channel,
  session,
}: {
  component: BaseComponent;
  channel: SessionChannel;
  session: SessionType;
}) => {
  return (
    <ComponentRenderer
      key={component.id}
      component={component}
      onUpdate={(value) => {
        channel.push('ui:io:response', {
          sessionId: session.id,
          componentId: component.id,
          componentType: component.type,
          value: value,
        });
      }}
    />
  );
};
