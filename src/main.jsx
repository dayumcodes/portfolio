import React from 'react'
import ReactDOM from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'

// v2 is the default homepage. The original 3D portfolio (v1) is preserved
// untouched and served under /v1; the studio-glass variant lives under /v3.
const isV1 = window.location.pathname.startsWith('/v1')
const isV3 = window.location.pathname.startsWith('/v3')

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
} else if (isV3) {
  Promise.all([import('./v3/V3App.jsx'), import('./v3/v3.css')]).then(([m]) => {
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
