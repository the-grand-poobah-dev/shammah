'use client';

export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0b1220', color: '#f8fafc' }}>
        <main role="alert" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
          <section style={{ width: 'min(100%, 480px)', border: '1px solid #334155', borderRadius: 18, padding: 24, background: '#111827', textAlign: 'center' }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Shammah needs a moment</h2>
            <p style={{ color: '#cbd5e1', marginBottom: 20 }}>The application shell could not render. Please retry.</p>
            <button type="button" onClick={() => reset()} style={{ minHeight: 44, padding: '10px 18px', borderRadius: 12, fontWeight: 700, background: '#0d9488', color: '#fff', border: 0 }}>Try again</button>
          </section>
        </main>
      </body>
    </html>
  );
}
