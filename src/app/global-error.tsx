"use client"; // Error boundaries must be Client Components

// Catches errors in the root layout itself (e.g. Header's own data
// fetching) — replaces the entire document when active, so it must define
// its own <html>/<body> and can't rely on globals.css/Tailwind being
// loaded (Next.js docs, file-conventions/error). Kept self-contained with
// inline styles for that reason; still respects light/dark via a plain
// prefers-color-scheme media query rather than the app's data-theme
// convention, since that convention lives in a stylesheet this file can't
// assume is present.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <style>{`
          :root { --bg: #0b0f17; --fg: #e8ebf0; --muted: #8b93a3; --border: #2a3242; --accent: #e2a33d; }
          @media (prefers-color-scheme: light) {
            :root { --bg: #f6f7f9; --fg: #14171c; --muted: #666e7c; --border: #d8dae0; --accent: #b6791f; }
          }
          body { background: var(--bg); color: var(--fg); font-family: system-ui, sans-serif; }
        `}</style>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div style={{ maxWidth: "28rem", textAlign: "center" }}>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Something went wrong</h1>
            <p style={{ marginTop: "1rem", fontSize: "0.875rem", color: "var(--muted)" }}>
              A critical error occurred while loading CertifiedBanger. Try reloading the page.
            </p>
            {error.digest && (
              <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--muted)" }}>
                Error ID: {error.digest}
              </p>
            )}
            <button
              type="button"
              onClick={() => retry()}
              style={{
                marginTop: "1.5rem",
                height: "2.5rem",
                padding: "0 1.25rem",
                borderRadius: "9999px",
                border: "none",
                background: "var(--accent)",
                color: "#1a1206",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
