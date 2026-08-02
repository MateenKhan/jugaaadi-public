import { StrictMode, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'

/** Every demo document mounts the same way; this is that one line. */
export function mount(element: ReactElement) {
  const host = document.getElementById('root')
  if (!host) throw new Error('#root is missing from the demo document')

  createRoot(host).render(<StrictMode>{element}</StrictMode>)
}
