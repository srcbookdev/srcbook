<!-- srcbook:{"language":"typescript"} -->

# Web App Generator Examples

This document provides real-world examples of using Srcbook's web app generator.

## Basic Todo App

Creating a simple todo app with local storage:

###### todo-app-example.ts

```typescript
// 1. Generate the app
const app = await generator.createApp({
  name: "todo-app",
  prompt: `
    Create a todo list app with:
    - Add/edit/delete todos
    - Local storage persistence
    - Dark mode support
    - Responsive design
  `
});

// 2. Generated files will include:

// src/components/TodoList.tsx
interface TodoList {
  const TodoList = () => {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [newTodo, setNewTodo] = useState('');

    useEffect(() => {
      const stored = localStorage.getItem('todos');
      if (stored) setTodos(JSON.parse(stored));
    }, []);

    const addTodo = (text: string) => {
      const todo = { id: Date.now(), text, completed: false };
      const updated = [...todos, todo];
      setTodos(updated);
      localStorage.setItem('todos', JSON.stringify(updated));
    };

    return (
      <div className="p-4">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          className="border p-2 rounded"
        />
        <button
          onClick={() => addTodo(newTodo)}
          className="ml-2 bg-blue-500 text-white p-2 rounded"
        >
          Add Todo
        </button>
        <ul className="mt-4">
          {todos.map(todo => (
            <TodoItem key={todo.id} todo={todo} />
          ))}
        </ul>
      </div>
    );
  };
}
```

## Weather Dashboard

Creating a weather dashboard with API integration:

###### weather-app-example.ts

```typescript
// 1. Generate the app
const app = await generator.createApp({
  name: "weather-dashboard",
  prompt: `
    Create a weather dashboard with:
    - Current weather display
    - 5-day forecast
    - Location search
    - Temperature unit toggle
    - Weather icons
  `
});

// 2. Generated files will include:

// src/components/WeatherDashboard.tsx
interface WeatherDashboard {
  const WeatherDashboard = () => {
    const [location, setLocation] = useState('');
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [unit, setUnit] = useState<'C' | 'F'>('C');

    const fetchWeather = async (loc: string) => {
      const response = await fetch(
        `https://api.weatherapi.com/v1/forecast.php?key=${API_KEY}&q=${loc}&days=5`
      );
      const data = await response.json();
      setWeather(data);
    };

    return (
      <div className="container mx-auto p-4">
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="border p-2 rounded flex-grow"
            placeholder="Enter location..."
          />
          <button
            onClick={() => fetchWeather(location)}
            className="bg-blue-500 text-white p-2 rounded"
          >
            Search
          </button>
          <button
            onClick={() => setUnit(unit === 'C' ? 'F' : 'C')}
            className="bg-gray-500 text-white p-2 rounded"
          >
            °{unit}
          </button>
        </div>
        {weather && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <CurrentWeather data={weather.current} unit={unit} />
            <ForecastList data={weather.forecast} unit={unit} />
          </div>
        )}
      </div>
    );
  };
}
```

## Blog Platform

Creating a blog platform with markdown support:

###### blog-app-example.ts

```typescript
// 1. Generate the app
const app = await generator.createApp({
  name: "markdown-blog",
  prompt: `
    Create a blog platform with:
    - Markdown post editing
    - Post previews
    - Categories and tags
    - Search functionality
    - Responsive design
  `
});

// 2. Generated files will include:

// src/components/MarkdownEditor.tsx
interface MarkdownEditor {
  const MarkdownEditor = () => {
    const [content, setContent] = useState('');
    const [preview, setPreview] = useState('');

    useEffect(() => {
      const rendered = marked(content);
      setPreview(rendered);
    }, [content]);

    return (
      <div className="grid grid-cols-2 gap-4 h-screen">
        <div className="p-4 border rounded">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full resize-none"
            placeholder="Write your post in markdown..."
          />
        </div>
        <div 
          className="p-4 border rounded prose"
          dangerouslySetInnerHTML={{ __html: preview }}
        />
      </div>
    );
  };
}
```

## E-commerce Store

Creating an e-commerce store with shopping cart:

###### ecommerce-example.ts

```typescript
// 1. Generate the app
const app = await generator.createApp({
  name: "ecommerce-store",
  prompt: `
    Create an e-commerce store with:
    - Product listing
    - Shopping cart
    - Checkout process
    - Product search
    - Categories
  `
});

// 2. Generated files will include:

// src/components/ProductGrid.tsx
interface ProductGrid {
  const ProductGrid = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [category, setCategory] = useState<string>('all');

    const addToCart = (product: Product) => {
      const existing = cart.find(item => item.id === product.id);
      if (existing) {
        setCart(cart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        setCart([...cart, { ...product, quantity: 1 }]);
      }
    };

    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-between mb-4">
          <CategoryFilter
            selected={category}
            onChange={setCategory}
          />
          <CartSummary items={cart} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products
            .filter(p => category === 'all' || p.category === category)
            .map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={addToCart}
              />
            ))}
        </div>
      </div>
    );
  };
}
```

## Next Steps

- Learn about [AI Integration](./ai-integration.src.md)
- Study [Project Structure](./project-structure.src.md)
- Explore [Package Management](./package-management.src.md)