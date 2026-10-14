import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SidePanelApp } from '@/components/SidePanelApp'
import './style.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Skimmy side panel: #root is missing from sidepanel/index.html')
}

createRoot(rootElement).render(
  <StrictMode>
    <SidePanelApp />
  </StrictMode>,
)
