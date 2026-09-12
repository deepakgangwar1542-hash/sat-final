/**
 * ResultsPanel — Master results container.
 * Assembles all visible artifacts in the order a judge would read them:
 *   1. Answer (top-level, prominent)
 *   2. Verifier result (agreement / conflicts / re-plan status)
 *   3. EarthQuery spec (query understanding)
 *   4. Sensor decision
 *   5. Agent outputs (per-specialist cards)
 *   6. Confidence breakdown (6-component radar + bars)
 *   7. Provenance graph (execution trace)
 *   8. Download report button
 */
import type { QueryResponse } from '../types';
import EarthQuerySpecPanel from './EarthQuerySpec';
import SensorDecision from './SensorDecision';
import AgentOutputCard from './AgentOutputCard';
import ConfidenceBreakdown from './ConfidenceBreakdown';
import ProvenanceGraph from './ProvenanceGraph';

interface Props { response: QueryResponse; }

export default function ResultsPanel({ response }: Props) {
  const v = response.verifier_result;

  return (
    <div className="results-panel" id="results-panel">
      {/* ── Answer ────────────────────────────────────────────────── */}
      <div className="card answer-card fade-in-up" id="answer-card">
        <div className="flex items-center gap-2 mb-3">
          <span style={{ fontSize: '1.4rem' }}>💡</span>
          <div>
            <p className="section-label" style={{ margin: 0 }}>Answer</p>
            <p className="text-xs text-muted">Query ID: <code className="text-mono">{response.query_id}</code></p>
          </div>
        </div>
        <p className="answer-text">{response.answer}</p>
        <a
          href={response.report_url}
          download
          className="btn btn-secondary btn-sm mt-4"
          id="download-report-btn"
          target="_blank"
          rel="noopener noreferrer"
        >
          📄 Download Full PDF Report
        </a>
      </div>

      {/* ── Verifier result ───────────────────────────────────────── */}
      <div
        className={`card verifier-card fade-in-up ${v.agreement ? 'verifier-ok' : 'verifier-conflict'}`}
        id="verifier-result-panel"
      >
        <div className="flex items-center gap-2 mb-2">
          <span style={{ fontSize: '1.1rem' }}>{v.agreement ? '✅' : v.replanned ? '🔄' : '⚠'}</span>
          <p className="section-label" style={{ margin: 0 }}>Evidence Verification</p>
          {v.agreement && <span className="badge badge-green">All agents agree</span>}
          {!v.agreement && v.replanned && <span className="badge badge-amber">Re-planned</span>}
          {!v.agreement && !v.replanned && <span className="badge badge-red">Conflicts detected</span>}
        </div>
        {v.conflicts_found.length > 0 && (
          <ul className="conflict-list">
            {v.conflicts_found.map((c, i) => (
              <li key={i} className="text-sm" style={{ color: 'var(--accent-warning)' }}>⚠ {c}</li>
            ))}
          </ul>
        )}
        {v.replan_reason && (
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            🔄 Re-plan: {v.replan_reason}
          </p>
        )}
      </div>

      {/* ── EarthQuery spec ───────────────────────────────────────── */}
      <EarthQuerySpecPanel spec={response.earthquery_spec} />

      {/* ── Sensor decision ───────────────────────────────────────── */}
      <SensorDecision sensor={response.sensor_selection} />

      {/* ── Agent outputs ─────────────────────────────────────────── */}
      <div className="card fade-in-up" id="agent-outputs-section">
        <p className="section-label mb-3">🤖 Specialist Agent Outputs ({response.agent_outputs.length})</p>
        <div className="agent-list">
          {response.agent_outputs.map((ao, i) => (
            <AgentOutputCard key={ao.agent_id} output={ao} index={i} />
          ))}
        </div>
      </div>

      {/* ── Confidence breakdown ──────────────────────────────────── */}
      <ConfidenceBreakdown breakdown={response.confidence_breakdown} />

      {/* ── Provenance graph ──────────────────────────────────────── */}
      <ProvenanceGraph trace={response.execution_trace} />

      <style>{`
        .results-panel { display: flex; flex-direction: column; gap: 1rem; }
        .answer-card { border-left: 3px solid var(--accent-primary); }
        .answer-text { font-size: 0.95rem; line-height: 1.7; color: var(--text-primary); white-space: pre-wrap; }
        .verifier-card { border-left: 3px solid; }
        .verifier-ok     { border-color: var(--accent-success); background: rgba(16,185,129,0.05); }
        .verifier-conflict { border-color: var(--accent-warning); background: rgba(245,158,11,0.05); }
        .conflict-list { padding-left: 1rem; display: flex; flex-direction: column; gap: 0.3rem; margin-top: 0.5rem; }
        .agent-list { display: flex; flex-direction: column; gap: 0.75rem; }
      `}</style>
    </div>
  );
}
