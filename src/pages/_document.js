// src/pages/_document.js
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Meta tags */}
        <meta charSet="utf-8" />
        <meta name="description" content="EzBillify - India's Best Billing Software. GST compliant invoicing, inventory management, and more." />
        <meta name="keywords" content="billing software, GST, invoice, India, accounting, inventory" />
        <meta name="author" content="EzBillify" />
        
        {/* Favicon */}
        <link rel="icon" href="/ezbillifyfavicon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        
        {/* Fonts - Inter for modern look - Optimized for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <noscript>
          <link 
            href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" 
            rel="stylesheet" 
          />
        </noscript>
        
        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#2563eb" />
        
        {/* PWA support (optional for future) */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="EzBillify" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="EzBillify - India's Best Billing Software" />
        <meta property="og:description" content="Complete billing solution with GST compliance, inventory management, and mobile workforce access." />
        <meta property="og:image" content="/og-image.png" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="EzBillify - India's Best Billing Software" />
        <meta property="twitter:description" content="Complete billing solution with GST compliance, inventory management, and mobile workforce access." />
        <meta property="twitter:image" content="/og-image.png" />
      </Head>
      <body className="font-sans antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
