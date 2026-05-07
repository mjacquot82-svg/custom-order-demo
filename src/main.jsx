import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const root = createRoot(document.getElementById('root'))

root.render(
  <App />,
)

requestAnimationFrame(() => {
  document.body.classList.add('app-ready')
})

// Register service worker for installable desktop/mobile app support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // safe fallback if registration fails
    })
  })
}
