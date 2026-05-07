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

// Disable stale PWA shell caching that causes first-load layout flashes
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister()
    })
  })
}
