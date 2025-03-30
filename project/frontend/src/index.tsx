import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import {BrowserRouter} from "react-router-dom";
import {createRoot} from "react-dom/client";
import { AuthProvider } from './context/AuthContext';

const root = createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
      <AuthProvider>
      <BrowserRouter>
          <App />
      </BrowserRouter>
      </AuthProvider>
  </React.StrictMode>,
);
reportWebVitals();
