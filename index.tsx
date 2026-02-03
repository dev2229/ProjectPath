
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("Initialization failure: Root element #root not found in document.");
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("ProjectPath Application Mounted Successfully.");
  } catch (err) {
    console.error("Mounting Error:", err);
    if (rootElement) {
      rootElement.innerHTML = `<div style="padding: 40px; color: white; text-align: center;">Mounting failed: ${err instanceof Error ? err.message : 'Unknown Error'}</div>`;
    }
  }
}
