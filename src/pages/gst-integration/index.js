// src/pages/gst-integration/index.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';

const GSTIntegrationIndex = () => {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard
    router.replace('/gst-integration/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to GST integration dashboard...</p>
      </div>
    </div>
  );
};

export default GSTIntegrationIndex;