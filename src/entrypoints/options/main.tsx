import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { OptionsApp } from '@/components/options/OptionsApp'
import '../sidepanel/style.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Skimmy options: #root is missing from options/index.html')
}

createRoot(rootElement).render(
  <StrictMode>
    <OptionsApp />
  </StrictMode>,
)
