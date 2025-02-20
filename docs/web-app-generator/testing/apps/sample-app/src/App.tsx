import React, { useState } from 'react';

export function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app">
      <h1>Sample App</h1>
      <div className="counter">
        <p>Count: {count}</p>
        <button onClick={() => setCount(count + 1)}>
          Increment
        </button>
      </div>
    </div>
  );
}
