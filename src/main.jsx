import React from 'react'
import ReactDOM from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'

// v2 is the default homepage. The original 3D portfolio (v1) is preserved
// untouched and served under /v1.
const isV1 = window.location.pathname.startsWith('/v1')

const root = ReactDOM.createRoot(document.getElementById('root'))

if (isV1) {
  Promise.all([import('./App.jsx'), import('./index.css')]).then(([m]) => {
    root.render(
      <React.StrictMode>
        <m.default />
        <Analytics />
      </React.StrictMode>,
    )
  })
} else {
  Promise.all([import('./v2/V2App.jsx'), import('./v2/v2.css')]).then(([m]) => {
    root.render(
      <React.StrictMode>
        <m.default />
        <Analytics />
      </React.StrictMode>,
    )
  })
}
