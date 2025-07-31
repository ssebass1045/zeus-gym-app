import React from 'react';
import ReactDOM from 'react-dom/client';
//import './index.css';
import App from './App';
// --- LÍNEA FALTANTE AÑADIDA ---
import { DataProvider } from './contexts/DataContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* Ahora DataProvider es reconocido */}
    <DataProvider>
      <App />
    </DataProvider>
  </React.StrictMode>
);
