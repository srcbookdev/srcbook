import React, { useState, useEffect } from 'react';
import { Renderer, RenderUpdate, RenderComponent } from '@srcbook/ui-sdk';

const TextInput: React.FC<{ label: string; onChange: (value: string) => void }> = ({
  label,
  onChange,
}) => (
  <div>
    <label>{label}</label>
    <input type="text" onChange={(e) => onChange(e.target.value)} />
  </div>
);

const NumberInput: React.FC<{ label: string; onChange: (value: number) => void }> = ({
  label,
  onChange,
}) => (
  <div>
    <label>{label}</label>
    <input type="number" onChange={(e) => onChange(parseFloat(e.target.value))} />
  </div>
);

const Markdown: React.FC<{ content: string }> = ({ content }) => (
  <div dangerouslySetInnerHTML={{ __html: content }} />
);

const ComponentRenderer: React.FC<{
  component: RenderComponent;
  onUpdate: (id: string, value: any) => void;
}> = ({ component, onUpdate }) => {
  switch (component.type) {
    case 'INPUT_TEXT':
      return (
        <TextInput
          label={component.props.label}
          onChange={(value) => onUpdate(component.id, value)}
        />
      );
    case 'INPUT_NUMBER':
      return (
        <NumberInput
          label={component.props.label}
          onChange={(value) => onUpdate(component.id, value)}
        />
      );
    case 'DISPLAY_MARKDOWN':
      return <Markdown content={component.props.content} />;
    default:
      return <div>Unknown component type: {component.type}</div>;
  }
};

export const SrcbookRenderer: React.FC = () => {
  const [components, setComponents] = useState<RenderComponent[]>([]);

  const renderer: Renderer = {
    render: async (update: RenderUpdate) => {
      setComponents(update.components);
    },
  };

  useEffect(() => {
    // Set up your WebSocket connection and
    // pass the renderer to SDK's initialization function
  }, []);

  const handleUpdate = (id: string, value: any) => {
    // Here you would typically send the update back to your server
    // For example: sendUpdateToServer(id, value);
  };

  return (
    <div>
      {components.map((component) => (
        <ComponentRenderer key={component.id} component={component} onUpdate={handleUpdate} />
      ))}
    </div>
  );
};
