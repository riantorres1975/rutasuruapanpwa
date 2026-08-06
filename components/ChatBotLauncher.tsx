"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const loadChatBot = () => import("@/components/ChatBot");
const ChatBot = dynamic(loadChatBot, {
  ssr: false,
  loading: () => <ChatButton loading />,
});

function ChatButton({
  loading = false,
  onClick,
}: {
  loading?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onFocus={() => void loadChatBot()}
      onPointerEnter={() => void loadChatBot()}
      className="ov-panel pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-foreground/12 bg-foreground/5 text-foreground/50 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl transition hover:border-foreground/25 hover:text-foreground/80 active:scale-[0.97] lg:h-10 lg:w-10 lg:rounded-lg lg:shadow-none"
      aria-label={loading ? "Cargando asistente de rutas" : "Abrir asistente de rutas"}
      aria-busy={loading}
      title="Pregunta sobre rutas"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M14 1H2C1.45 1 1 1.45 1 2v9c0 .55.45 1 1 1h2v3l3-3h7c.55 0 1-.45 1-1V2c0-.55-.45-1-1-1z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export default function ChatBotLauncher() {
  const [activated, setActivated] = useState(false);

  if (activated) return <ChatBot initialOpen />;
  return <ChatButton onClick={() => setActivated(true)} />;
}
