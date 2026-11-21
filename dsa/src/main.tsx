import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { AlgorithmPage } from './pages/AlgorithmPage'
import { Home } from './pages/Home'
import { Structures } from './pages/Structures'
import './styles.css'

function App() {
  return (
    <BrowserRouter>
      <header className="topbar">
        <Link to="/" className="brand">
          <svg viewBox="0 0 32 32" aria-hidden>
            <g stroke="#7dd3fc" strokeWidth="1.6" opacity=".7">
              <line x1="9" y1="10" x2="22" y2="8" />
              <line x1="9" y1="10" x2="14" y2="23" />
              <line x1="22" y1="8" x2="14" y2="23" />
            </g>
            <circle cx="9" cy="10" r="3" fill="#7dd3fc" />
            <circle cx="22" cy="8" r="2.4" fill="#c4b5fd" />
            <circle cx="14" cy="23" r="3.2" fill="#fda4af" />
          </svg>
          Pattern Atlas
        </Link>
        <nav>
          <Link to="/">Atlas</Link>
          <Link to="/structures">Data structures</Link>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/a/:id" element={<AlgorithmPage />} />
        <Route path="/structures" element={<Structures />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <footer className="footer">
        <span>Pattern Atlas · dsa.techside.in</span>
        <span className="muted">Progress is saved in this browser only.</span>
      </footer>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
