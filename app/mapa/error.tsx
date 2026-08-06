'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { reportClientError } from '@/lib/client-error-report';

export default function MapError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError(error, 'boundary', 'mapa');
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#0c110a',
        color: '#e8f2d8',
        fontFamily: 'system-ui, sans-serif',
        padding: '1rem',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>🗺️</p>
        <h1 style={{ margin: '0 0 0.75rem', fontSize: '1.25rem' }}>El mapa no pudo cargar</h1>
        <p style={{ margin: '0 0 1.5rem', color: '#9cba74', fontSize: '0.9rem' }}>
          Verifica tu conexión a internet e intenta de nuevo.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={reset}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: 8,
              border: '1px solid #4a7c2f',
              background: '#1e3a0f',
              color: '#c8e6a0',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            Reintentar
          </button>
          <Link
            href="/"
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: 8,
              border: '1px solid #4a7c2f',
              background: 'transparent',
              color: '#c8e6a0',
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
