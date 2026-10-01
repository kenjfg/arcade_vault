"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      className="fade-in"
      style={{ textAlign: "center", padding: "96px 16px" }}
    >
      <div
        className="pixel neon-magenta"
        style={{ fontSize: 18, marginBottom: 16 }}
      >
        SEÑAL PERDIDA
      </div>
      <p style={{ color: "var(--ink-faint)", marginBottom: 28 }}>
        No pudimos conectar con el vault. Inténtalo de nuevo en unos segundos.
      </p>
      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <button className="btn lg" onClick={() => retry()}>
          REINTENTAR
        </button>
        <Link href="/" className="btn ghost lg">
          IR AL INICIO
        </Link>
      </div>
    </div>
  );
}
