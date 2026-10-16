import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import './index.css'
import { AuthGate } from './components/AuthGate.jsx'

// 주소(?media=)를 읽고 바꾸려고 라우터로 감싼다 (PRD ADR-1)
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <AuthGate />
    </HashRouter>
  </StrictMode>,
)
