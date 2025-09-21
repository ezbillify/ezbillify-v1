// src/pages/404.js
import Link from 'next/link'

export default function Custom404() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div>
        <h1 style={{ fontSize: '4rem', marginBottom: '1rem' }}>404</h1>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Page Not Found</h2>
        <p style={{ marginBottom: '2rem' }}>
          The page you're looking for doesn't exist.
        </p>
        <Link href="/" style={{ 
          background: '#3B82F6', 
          color: 'white', 
          padding: '12px 24px', 
          borderRadius: '8px', 
          textDecoration: 'none',
          display: 'inline-block'
        }}>
          Go Home
        </Link>
      </div>
    </div>
  )
}
