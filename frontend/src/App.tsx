/**
 * App — SatQuery AI main application shell.
 *
 * Layout:
 *   - Fixed navbar with ISRO branding and PS reference
 *   - Hero section with animated pitch
 *   - Two-column layout: QueryComposer (left) | ResultsPanel (right)
 *   - Loading skeleton state
 *   - Error display
 */
import { useState, useCallback } from 'react';
import type { QueryResponse, QueryRequest } from './types';
import QueryComposer from './components/QueryComposer';
import ResultsPanel from './components/ResultsPanel';
import EarthGlobeBackground, { resolveLocationFromQuery, type GeoTarget } from './components/EarthGlobeBackground';

async function callAnalyze(req: QueryRequest): Promise<QueryResponse> {
  const res = await fetch('/query/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? 'API error');
  }
  return res.json();
}

export default function App() {
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetLocation, setTargetLocation] = useState<GeoTarget | null>(null);

  const handleAnalyze = useCallback(async (req: QueryRequest) => {
    setLoading(true);
    setError(null);
    setResponse(null);

    // Immediately resolve location if mentioned in query to start 3D camera fly-to
    const preTarget = resolveLocationFromQuery(req.question);
    if (preTarget) {
      setTargetLocation(preTarget);
    }

    try {
      const result = await callAnalyze(req);
      setResponse(result);

      // Also check extracted entities from backend EarthQuerySpec
      const entities = result.earthquery_spec?.extracted_entities || [];
      const resolved = resolveLocationFromQuery(result.question, entities);
      if (resolved) {
        setTargetLocation(resolved);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="app">
      {/* ── 3D Interactive Earth Background ────────────────────────── */}
      <EarthGlobeBackground
        targetLocation={targetLocation}
        onResetTarget={() => setTargetLocation(null)}
      />

      {/* ── Navbar ──────────────────────────────────────────────────── */}
      <nav className="navbar" id="main-navbar">
        <div className="navbar-inner">
          <div className="nav-brand">
            <div className="nav-logo">🛰</div>
            <div>
              <h1 className="nav-title gradient-text">SatQuery AI</h1>
              <p className="nav-subtitle">Interactive Vision-Language Assistant for Remote Sensing</p>
            </div>
          </div>
          <div className="nav-badges">
            <span className="badge badge-blue">SIH26167</span>
            <span className="badge badge-cyan">ISRO</span>
            <span className="badge badge-purple">Smart India Hackathon 2026</span>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <header className="hero" id="hero-section">
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />
        <div className="hero-content">
          <div className="hero-badge fade-in">
            <span>🏆</span>
            <span>ISRO Problem Statement SIH26167</span>
          </div>
          <h1 className="hero-title fade-in-up" style={{ animationDelay: '0.05s' }}>
            Ask anything about<br />
            <span className="gradient-text">satellite imagery</span>
          </h1>
          <p className="hero-desc fade-in-up" style={{ animationDelay: '0.1s' }}>
            Multimodal VQA · Change Detection · SAR-Optical Fusion · Visual Grounding · Agentic Pipeline
          </p>
          <div className="hero-pills fade-in-up" style={{ animationDelay: '0.15s' }}>
            {['BLIP-2 VQA', 'ChangeFormer', 'SAM Grounding', 'GF-SARNet', '6-Component Confidence', 'Voice Input'].map(p => (
              <span key={p} className="hero-pill">{p}</span>
            ))}
          </div>
        </div>
      </header>

      {/* ── Main workspace ──────────────────────────────────────────── */}
      <main className="workspace" id="main-workspace">
        {/* Left: Query input */}
        <section className="workspace-left" aria-label="Query input">
          <QueryComposer onAnalyze={handleAnalyze} loading={loading} />


        </section>

        {/* Right: Results */}
        <section className="workspace-right" aria-label="Analysis results">
          {loading && <LoadingSkeleton />}
          {error && <ErrorCard message={error} />}
          {response && !loading && <ResultsPanel response={response} />}
          {!loading && !error && !response && <EmptyState />}
        </section>
      </main>

      <style>{`
        .app { min-height: 100vh; display: flex; flex-direction: column; }

        /* Navbar */
        .navbar {
          position: sticky; top: 0; z-index: 100;
          background: rgba(6,10,20,0.85); backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border-card);
          padding: 0.75rem 2rem;
        }
        .navbar-inner { max-width: 1400px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; }
        .nav-brand { display: flex; align-items: center; gap: 0.75rem; }
        .nav-logo { font-size: 1.8rem; line-height: 1; }
        .nav-title { font-size: 1.25rem; font-weight: 800; line-height: 1.1; }
        .nav-subtitle { font-size: 0.68rem; color: var(--text-muted); white-space: nowrap; }
        .nav-badges { display: flex; gap: 0.4rem; flex-wrap: wrap; }

        /* Hero */
        .hero {
          position: relative; overflow: hidden;
          padding: 3.5rem 2rem 3rem; text-align: center;
        }
        .hero-orb { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; }
        .hero-orb-1 { width: 400px; height: 400px; background: rgba(59,130,246,0.12); top: -100px; left: -100px; }
        .hero-orb-2 { width: 350px; height: 350px; background: rgba(139,92,246,0.10); top: -50px; right: -80px; }
        .hero-orb-3 { width: 300px; height: 300px; background: rgba(6,182,212,0.08); bottom: -80px; left: 50%; transform: translateX(-50%); }
        .hero-content { position: relative; z-index: 1; max-width: 720px; margin: 0 auto; }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 0.4rem;
          background: rgba(59,130,246,0.12); border: 1px solid rgba(59,130,246,0.3);
          border-radius: 999px; padding: 5px 16px; font-size: 0.78rem; font-weight: 600;
          color: var(--text-accent); margin-bottom: 1.25rem;
        }
        .hero-title { margin-bottom: 0.8rem; letter-spacing: -0.02em; }
        .hero-desc { font-size: 0.92rem; color: var(--text-muted); margin-bottom: 1.25rem; }
        .hero-pills { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.4rem; }
        .hero-pill {
          padding: 3px 12px; background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08); border-radius: 999px;
          font-size: 0.72rem; font-weight: 600; color: var(--text-secondary);
        }

        /* Workspace */
        .workspace {
          flex: 1; display: grid; grid-template-columns: 420px 1fr;
          gap: 1.5rem; padding: 1.5rem 2rem 3rem; max-width: 1400px;
          margin: 0 auto; width: 100%; align-items: start;
        }
        .workspace-left { display: flex; flex-direction: column; gap: 1rem; position: sticky; top: 80px; }
        .workspace-right { min-width: 0; }



        @media (max-width: 900px) {
          .workspace { grid-template-columns: 1fr; }
          .workspace-left { position: static; }
        }
        @media (max-width: 600px) {
          .navbar { padding: 0.6rem 1rem; }
          .workspace { padding: 1rem; }
          .hero { padding: 2rem 1rem; }
          .nav-badges .badge:nth-child(n+3) { display: none; }
        }
      `}</style>
    </div>
  );
}



// ── Loading skeleton ──────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="loading-skeleton fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {[200, 120, 160, 280, 220].map((h, i) => (
        <div key={i} className="skeleton" style={{ height: `${h}px`, borderRadius: 'var(--radius-lg)' }} />
      ))}
      <div className="loading-label">
        <div className="spinner spinner-lg" />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Running agentic pipeline…</span>
      </div>
      <style>{`
        .loading-label { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 1.5rem; }
      `}</style>
    </div>
  );
}

// ── Error card ────────────────────────────────────────────────────────────────
function ErrorCard({ message }: { message: string }) {
  return (
    <div className="card fade-in" style={{ borderLeft: '3px solid var(--accent-danger)' }} id="error-card">
      <div className="flex items-center gap-2 mb-2">
        <span style={{ fontSize: '1.3rem' }}>⚠</span>
        <p className="section-label" style={{ margin: 0, color: 'var(--accent-danger)' }}>Pipeline Error</p>
      </div>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{message}</p>
      <p className="text-xs text-muted mt-3">
        Make sure the backend is running: <code className="text-mono">uvicorn backend.main:app --reload</code>
      </p>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="empty-state fade-in" id="empty-state">
      <div className="empty-orb">🛰</div>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>Ready to analyze</h2>
      <p className="text-secondary" style={{ maxWidth: '360px', textAlign: 'center', fontSize: '0.9rem' }}>
        Type or speak a question about your satellite imagery. Select one of the suggested query types,
        or upload your own images and ask anything.
      </p>
      <div className="empty-features">
        {['🔍 VQA', '📝 Caption', '📍 Grounding', '🔄 Change', '📡 SAR+Optical', '🎤 Voice'].map(f => (
          <span key={f} className="hero-pill" style={{ fontSize: '0.78rem' }}>{f}</span>
        ))}
      </div>
      <style>{`
        .empty-state { display: flex; flex-direction: column; align-items: center; padding: 3rem 2rem; gap: 1rem; }
        .empty-orb { font-size: 4rem; line-height: 1; filter: drop-shadow(0 0 30px rgba(59,130,246,0.4)); }
        .empty-features { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.4rem; margin-top: 0.5rem; }
      `}</style>
    </div>
  );
}
