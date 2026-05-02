'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

const ISSUE_URL = 'https://github.com/riantorres1975/rutasuruapanpwa/issues/new';
const REPORT_EMAIL = 'contacto@urugo.app';

type Message = { role: 'user' | 'bot'; text: string };
type UserLocation = { lat: number; lng: number } | null;
type View = 'chat' | 'report';

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<UserLocation>(null);
  const [locStatus, setLocStatus] = useState<'idle' | 'granted' | 'denied'>('idle');
  const [desktopStyle, setDesktopStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Reporte
  const [reportRoute, setReportRoute] = useState('');
  const [reportError, setReportError] = useState('');
  const [reportCorrect, setReportCorrect] = useState('');

  const reportSubject = reportRoute.trim()
    ? `Reporte asistente UruGo: ${reportRoute.trim()}`
    : 'Reporte asistente UruGo';

  const reportBodyText = [
    'Tipo de problema:',
    'Error en asistente de chat',
    '',
    'Ruta relacionada:',
    reportRoute.trim() || 'No especificada',
    '',
    'Qué dijo mal el bot:',
    reportError.trim() || 'No especificado',
    '',
    'Información correcta:',
    reportCorrect.trim() || 'No especificada',
  ].join('\n');

  const emailHref = `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(reportSubject)}&body=${encodeURIComponent(reportBodyText)}`;

  const issueHref = useMemo(() => {
    const title = `[Asistente] ${reportRoute.trim() || 'Error en respuesta del bot'}`;
    const body = [
      '## Tipo de problema',
      'Error en asistente de chat',
      '',
      '## Ruta relacionada',
      reportRoute.trim() || 'No especificada',
      '',
      '## Qué dijo mal el bot',
      reportError.trim() || 'No especificado',
      '',
      '## Información correcta',
      reportCorrect.trim() || 'No especificada',
    ].join('\n');
    return `${ISSUE_URL}?${new URLSearchParams({ title, body, labels: 'bug,asistente' }).toString()}`;
  }, [reportRoute, reportError, reportCorrect]);

  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    setIsMobile(window.innerWidth < 768);
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Bloquear scroll del body cuando el chat está abierto en mobile
  useEffect(() => {
    if (!mounted) return;
    if (open && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open, isMobile, mounted]);

  // Click fuera para cerrar (solo desktop)
  useEffect(() => {
    if (!open || isMobile) return;
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || btnRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [open, isMobile]);

  // Posición del panel en desktop
  function calcDesktopStyle() {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setDesktopStyle({
      top: rect.bottom + 8,
      right: vw - rect.right,
      width: 320,
      maxHeight: vh - rect.bottom - 16,
    });
  }

  useEffect(() => {
    if (!open || isMobile) return;
    calcDesktopStyle();
    const onResize = () => calcDesktopStyle();
    window.addEventListener('resize', onResize);
    setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.removeEventListener('resize', onResize);
  }, [open, isMobile]);

  // En mobile: focus al input cuando se abre
  useEffect(() => {
    if (open && isMobile) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, isMobile]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  function requestLocation() {
    if (!navigator.geolocation) { setLocStatus('denied'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocStatus('granted'); },
      () => setLocStatus('denied'),
      { timeout: 6000 }
    );
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Message = { role: 'user', text };
    const next = [...messages, userMsg].slice(-10);
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const history = next.slice(0, -1).map((m) => ({ role: m.role, text: m.text }));
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, location }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setMessages((prev) => [...prev, { role: 'bot' as const, text: 'Demasiadas preguntas seguidas. Espera un momento e intenta de nuevo.' }].slice(-10));
        return;
      }
      setMessages((prev) => [...prev, { role: 'bot' as const, text: data.reply ?? 'Sin respuesta.' }].slice(-10));
    } catch {
      setMessages((prev) => [...prev, { role: 'bot' as const, text: 'Hubo un error, intenta de nuevo.' }].slice(-10));
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function openReport() {
    setReportRoute('');
    setReportError('');
    setReportCorrect('');
    setView('report');
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(140,200,80,0.15)', borderRadius: 8,
    padding: '7px 10px', color: 'var(--foreground, #e8f2d8)',
    fontSize: 12, outline: 'none', resize: 'none' as const,
  };

  // ── Contenido interior compartido entre mobile y desktop ──────────────────
  const panelContent = (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderBottom: '1px solid rgba(140,200,80,0.10)', flexShrink: 0 }}>
        {/* Handle drag (solo mobile) */}
        {isMobile && (
          <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--verde, #6aab48)', display: 'inline-block' }} />
          <span style={{ color: 'var(--foreground, #e8f2d8)', fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>
            {view === 'report' ? 'Reportar error' : 'Asistente UruGo'}
          </span>
          {view === 'chat' && (
            <span style={{ fontSize: 10, background: 'rgba(255,180,0,0.12)', color: '#f5a623', border: '1px solid rgba(255,180,0,0.25)', borderRadius: 6, padding: '1px 6px', fontWeight: 600 }}>
              BETA
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {view === 'chat' ? (
            <>
              <button type="button" onClick={requestLocation}
                title={locStatus === 'granted' ? 'Ubicación activa' : locStatus === 'denied' ? 'Permiso denegado' : 'Compartir ubicación'}
                style={{ background: 'none', border: 'none', cursor: locStatus === 'denied' ? 'default' : 'pointer', padding: '2px 4px', fontSize: 14, opacity: locStatus === 'denied' ? 0.3 : locStatus === 'granted' ? 1 : 0.5 }}
                aria-label="Compartir ubicación"
              >
                {locStatus === 'granted' ? '📍' : '🔍'}
              </button>
              <button type="button" onClick={openReport}
                title="Reportar información incorrecta"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: 14, opacity: 0.6 }}
                aria-label="Reportar error"
              >🚩</button>
            </>
          ) : (
            <button type="button" onClick={() => setView('chat')}
              style={{ background: 'none', border: 'none', color: 'var(--foreground, #e8f2d8)', opacity: 0.6, cursor: 'pointer', padding: '2px 8px', fontSize: 12, fontWeight: 600 }}
            >← Volver</button>
          )}
          <button type="button" onClick={() => setOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--foreground, #e8f2d8)', opacity: 0.4, cursor: 'pointer', padding: '2px 6px', fontSize: 16, lineHeight: 1 }}
            aria-label="Cerrar chat"
          >✕</button>
        </div>
      </div>

      {/* Vista: Chat */}
      {view === 'chat' && (
        <>
          {locStatus === 'idle' && messages.length === 0 && (
            <button type="button" onClick={requestLocation} style={{ background: 'rgba(106,171,72,0.08)', border: 'none', borderBottom: '1px solid rgba(140,200,80,0.10)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: 'left', width: '100%', flexShrink: 0 }}>
              <span style={{ fontSize: 14 }}>📍</span>
              <span style={{ color: 'var(--foreground, #e8f2d8)', fontSize: 12, opacity: 0.7, lineHeight: 1.4 }}>Compartir ubicación para sugerencias más precisas</span>
            </button>
          )}
          {locStatus === 'granted' && (
            <div style={{ background: 'rgba(106,171,72,0.08)', borderBottom: '1px solid rgba(140,200,80,0.10)', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 12 }}>📍</span>
              <span style={{ color: 'var(--verde, #6aab48)', fontSize: 11, fontWeight: 600 }}>Ubicación activa</span>
            </div>
          )}

          {/* Mensajes */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
            {messages.length === 0 && (
              <p style={{ color: 'var(--foreground, #e8f2d8)', opacity: 0.35, fontSize: 12, textAlign: 'center', margin: 'auto', lineHeight: 1.5 }}>
                Pregunta sobre rutas, horarios<br />o cómo llegar a algún lugar.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <span style={{
                  maxWidth: '82%', padding: '7px 11px',
                  borderRadius: m.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                  background: m.role === 'user' ? 'var(--verde, #6aab48)' : 'rgba(255,255,255,0.07)',
                  color: m.role === 'user' ? '#fff' : 'var(--foreground, #e8f2d8)',
                  fontSize: 13, lineHeight: 1.45, wordBreak: 'break-word',
                }}>{m.text}</span>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <span style={{ padding: '7px 14px', borderRadius: '12px 12px 12px 3px', background: 'rgba(255,255,255,0.07)', color: 'var(--foreground, #e8f2d8)', opacity: 0.5, fontSize: 12 }}>
                  escribiendo...
                </span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Banner beta */}
          <div style={{ padding: '6px 14px', borderTop: '1px solid rgba(140,200,80,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: 'var(--foreground, #e8f2d8)', opacity: 0.4, lineHeight: 1.4 }}>
              ⚠️ Info en beta, puede tener errores
            </span>
            <button type="button" onClick={openReport}
              style={{ background: 'none', border: '1px solid rgba(255,100,50,0.3)', borderRadius: 6, padding: '2px 8px', color: '#f5a623', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600 }}
            >🚩 Reportar</button>
          </div>

          {/* Input */}
          <div style={{ display: 'flex', gap: 6, padding: '10px 12px', borderTop: '1px solid rgba(140,200,80,0.10)', flexShrink: 0 }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="¿Cómo llego al IMSS?"
              disabled={loading}
              style={{ flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(140,200,80,0.12)', borderRadius: 10, padding: '8px 11px', color: 'var(--foreground, #e8f2d8)', fontSize: 13, outline: 'none' }}
            />
            <button type="button" onClick={send} disabled={loading || !input.trim()}
              style={{ background: 'var(--verde, #6aab48)', border: 'none', borderRadius: 10, padding: '8px 13px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: loading || !input.trim() ? 'default' : 'pointer', opacity: loading || !input.trim() ? 0.4 : 1, transition: 'opacity 0.15s', whiteSpace: 'nowrap' }}
            >Enviar</button>
          </div>
        </>
      )}

      {/* Vista: Reporte */}
      {view === 'report' && (
        <div style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', minHeight: 0 }}>
          <p style={{ color: 'var(--foreground, #e8f2d8)', opacity: 0.55, fontSize: 12, lineHeight: 1.5, margin: 0 }}>
            ¿El bot dio información incorrecta? Llena los campos y elige cómo enviarlo.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ color: 'var(--foreground, #e8f2d8)', fontSize: 11, fontWeight: 600, opacity: 0.7 }}>Ruta (opcional)</label>
            <input type="text" value={reportRoute} onChange={(e) => setReportRoute(e.target.value)} placeholder="Ej: Ruta 2, Ruta 25..." style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ color: 'var(--foreground, #e8f2d8)', fontSize: 11, fontWeight: 600, opacity: 0.7 }}>¿Qué dijo mal el bot? *</label>
            <textarea value={reportError} onChange={(e) => setReportError(e.target.value)} placeholder="Ej: Dijo que la Ruta 2 pasa por el centro..." rows={3} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ color: 'var(--foreground, #e8f2d8)', fontSize: 11, fontWeight: 600, opacity: 0.7 }}>¿Cuál es la información correcta?</label>
            <textarea value={reportCorrect} onChange={(e) => setReportCorrect(e.target.value)} placeholder="Ej: La Ruta 2 va de Constituyentes a Jicalán..." rows={3} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
            <a href={issueHref} target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: 8, border: '1px solid rgba(140,200,80,0.2)', color: 'var(--foreground, #e8f2d8)', fontSize: 12, fontWeight: 600, textDecoration: 'none', opacity: reportError.trim() ? 0.8 : 0.3, pointerEvents: reportError.trim() ? 'auto' : 'none' }}
            >Reportar en GitHub</a>
            <a href={emailHref}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: 8, background: 'var(--verde, #6aab48)', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', opacity: reportError.trim() ? 1 : 0.35, pointerEvents: reportError.trim() ? 'auto' : 'none' }}
            >Enviar por correo</a>
          </div>
        </div>
      )}
    </>
  );

  if (!mounted) return (
    <button ref={btnRef} type="button" onClick={() => setOpen(true)}
      className="ov-panel pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl transition active:scale-[0.97] md:h-10 md:w-10 md:rounded-lg md:shadow-none border-foreground/12 bg-foreground/5 text-foreground/50"
      aria-label="Abrir asistente de rutas"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M14 1H2C1.45 1 1 1.45 1 2v9c0 .55.45 1 1 1h2v3l3-3h7c.55 0 1-.45 1-1V2c0-.55-.45-1-1-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none" />
      </svg>
    </button>
  );

  // ── Panel MOBILE: bottom sheet de pantalla completa ───────────────────────
  const mobileSheet = isMobile ? createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 99998,
          background: 'rgba(0,0,0,0.55)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.25s',
        }}
      />
      {/* Sheet */}
      <div
        ref={panelRef}
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0,
          zIndex: 99999,
          background: 'var(--surface, #111a0d)',
          borderTop: '1px solid rgba(140,200,80,0.18)',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.65)',
          display: 'flex',
          flexDirection: 'column',
          // 70% de la pantalla, se ajusta solo con el teclado gracias a dvh
          height: '70dvh',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {panelContent}
      </div>
    </>,
    document.body
  ) : null;

  // ── Panel DESKTOP: flotante posicionado sobre el botón ────────────────────
  const desktopPanel = !isMobile && open ? createPortal(
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        ...desktopStyle,
        background: 'var(--surface, #111a0d)',
        border: '1px solid rgba(140,200,80,0.18)',
        borderRadius: 16,
        boxShadow: '0 8px 40px rgba(0,0,0,0.65)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 99999,
      }}
    >
      {panelContent}
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`ov-panel pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl transition active:scale-[0.97] md:h-10 md:w-10 md:rounded-lg md:shadow-none ${
          open ? 'border-lima/40 bg-lima/12 text-lima' : 'border-foreground/12 bg-foreground/5 text-foreground/50 hover:border-foreground/25 hover:text-foreground/80'
        }`}
        aria-label="Abrir asistente de rutas"
        title="Pregunta sobre rutas"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M14 1H2C1.45 1 1 1.45 1 2v9c0 .55.45 1 1 1h2v3l3-3h7c.55 0 1-.45 1-1V2c0-.55-.45-1-1-1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none" />
        </svg>
      </button>
      {mobileSheet}
      {desktopPanel}
    </>
  );
}
