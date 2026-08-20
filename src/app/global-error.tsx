"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    fetch("/api/log-erro", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        origem: "global-error",
        mensagem: error.message,
        url: window.location.pathname,
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1rem",
          color: "#18181A",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
          Erro inesperado
        </h1>
        <p style={{ color: "#5a6b80", fontSize: "0.875rem", maxWidth: 360 }}>
          Ocorreu um erro ao carregar o aplicativo. Recarregue a página.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            background: "#0090D8",
            color: "#fff",
            border: 0,
            borderRadius: 8,
            padding: "0.5rem 1rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Recarregar
        </button>
      </body>
    </html>
  );
}
