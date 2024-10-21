import { expect, test, describe } from 'vitest';
import { parsePlan } from '../ai/plan-parser.mjs';
import { type App as DBAppType } from '../db/schema.mjs';
import { vi } from 'vitest';

// Mock the loadFile function
vi.mock('../apps/disk.mjs', () => ({
  loadFile: vi.fn().mockImplementation((_app, filePath) => {
    if (filePath === 'src/App.tsx') {
      return Promise.resolve({ source: 'Original App.tsx content' });
    }
    return Promise.reject(new Error('File not found'));
  }),
}));

const mockApp: DBAppType = {
  id: 123,
  externalId: '123',
  name: 'Test App',
  createdAt: new Date(),
  updatedAt: new Date(),
  history: '',
  historyVersion: 1,
};

const mockXMLResponse = `
<plan>
  <planDescription>Implement a basic todo list app</planDescription>
  <action type="file">
    <description>Update App.tsx with todo list functionality</description>
    <file filename="src/App.tsx">
      <![CDATA[
import React, { useState, useEffect } from 'react';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    const storedTodos = localStorage.getItem('todos');
    if (storedTodos) {
      setTodos(JSON.parse(storedTodos));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  const addTodo = () => {
    if (inputValue.trim() !== '') {
      setTodos([...todos, { id: Date.now(), text: inputValue, completed: false }]);
      setInputValue('');
    }
  };

  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Todo List</h1>
      <div className="flex mb-4">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="flex-grow p-2 border rounded-l"
          placeholder="Add a new todo"
        />
        <button onClick={addTodo} className="bg-blue-500 text-white p-2 rounded-r">Add</button>
      </div>
      <ul>
        {todos.map(todo => (
          <li key={todo.id} className="flex items-center mb-2">
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
              className="mr-2"
            />
            <span className={todo.completed ? 'line-through' : ''}>{todo.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
      ]]>
    </file>
  </action>
  <action type="command">
    <description>Install required packages</description>
    <commandType>npm install</commandType>
    <package>@types/react</package>
    <package>@types/react-dom</package>
  </action>
</plan>
`;

describe('parsePlan', () => {
  test('should correctly parse a plan with file and command actions', async () => {
    const plan = await parsePlan(mockXMLResponse, mockApp, 'test query', '123445');

    expect(plan.id).toBe('123445');
    expect(plan.query).toBe('test query');
    expect(plan.description).toBe('Implement a basic todo list app');
    expect(plan.actions).toHaveLength(2);

    // Check file action
    const fileAction = plan.actions[0] as any;
    expect(fileAction.type).toBe('file');
    expect(fileAction.path).toBe('src/App.tsx');
    expect(fileAction.modified).toContain('function App()');
    expect(fileAction.original).toBe('Original App.tsx content');
    expect(fileAction.description).toBe('Update App.tsx with todo list functionality');

    // Check command action
    const commandAction = plan.actions[1] as any;
    expect(commandAction.type).toBe('command');
    expect(commandAction.command).toBe('npm install');
    expect(commandAction.packages).toEqual(['@types/react', '@types/react-dom']);
    expect(commandAction.description).toBe('Install required packages');
  });
});
