import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Prototype from './Prototype'
import './prototype.css'
import './visuals.css'

const host = document.getElementById('root')
if (!host) throw new Error('#root is missing from prototype.html')

createRoot(host).render(
  <StrictMode>
    <Prototype />
  </StrictMode>,
)
