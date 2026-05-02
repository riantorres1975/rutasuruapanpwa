'use client';

import Link from 'next/link';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
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
        <p style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>⚠️</p>
        <h1 style={{ margin: '0 0 0.75rem', fontSize: '1.25rem' }}>Algo salió mal</h1>
        <p style={{ margin: '0 0 1.5rem', color: '#9cba74', fontSize: '0.9rem' }}>
          Ocurrió un error inesperado. Puedes intentar de nuevo o volver al inicio.
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
