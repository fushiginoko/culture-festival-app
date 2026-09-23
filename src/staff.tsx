import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import StaffPage from './pages/StaffPage'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StaffPage />
  </StrictMode>,
)
