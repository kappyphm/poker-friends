import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Set the theme before first paint: saved choice wins, default is dark.
const savedTheme = localStorage.getItem('pf-theme');
document.documentElement.dataset.theme = savedTheme === 'light' ? 'light' : 'dark';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
