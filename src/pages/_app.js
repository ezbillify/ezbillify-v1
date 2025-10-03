// src/pages/_app.js
import { AuthProvider } from '../context/AuthContext'
import { ToastProvider } from '../context/ToastContext'
import { ToastContainer } from '../components/shared/feedback/Toast'
import '../styles/globals.css'

export default function App({ Component, pageProps }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <Component {...pageProps} />
        <ToastContainer />
      </AuthProvider>
    </ToastProvider>
  )
}