import { useState } from "preact/hooks";

export function Chessboard() {
  const [count, setCount] = useState(0);

  return (
    <div class="gi-tcg-chessboard">
      <h1>Vite + Preact <span class="text-red">+ UnoCSS</span></h1>
      <div class="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/app.tsx</code> and save to test HMR
        </p>
      </div>
      <p class="read-the-docs">
        Click on the Vite and Preact logos to learn more
      </p>
    </div>
  );
}
