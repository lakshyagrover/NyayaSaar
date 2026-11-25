import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api.js'

// Badge style map for citation types
export default function SimilarJudgments() {
  const { id } = useParams()

  const [data, setData]       = useState(null)   // { similar[], targetCase, disclaimer }
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [citations, setCitations] = useState(null)  // { citations[], count }
  const [citLoading, setCitLoading] = useState(false)
  const [citError, setCitError]     = useState(null)
  const [extracting, setExtracting] = useState(false)

  // ── Fetch similar judgments ───────────────────────────────────────────────
  const loadSimilar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/similar/${id}`)
      setData(res.data)
    } catch (err) {
      const msg =
        err.response?.status === 404
          ? 'Case not found or you do not have permission to view it.'
          : err.response?.data?.message || 'Failed to load similar judgments.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [id])

  // ── Fetch stored citations ────────────────────────────────────────────────
  const loadCitations = useCallback(async () => {
    setCitLoading(true)
    setCitError(null)
    try {
      const res = await api.get(`/citations/${id}`)
      setCitations(res.data)
    } catch (err) {
      setCitError(err.response?.data?.message || 'Failed to load citations.')
    } finally {
      setCitLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadSimilar()
    loadCitations()
  }, [loadSimilar, loadCitations])

  // ── Run citation extraction ───────────────────────────────────────────────
  const handleExtractCitations = async () => {
    setExtracting(true)
    setCitError(null)
    try {
      const res = await api.post(`/citations/${id}`)
      setCitations(res.data)
    } catch (err) {
      setCitError(err.response?.data?.message || 'Citation extraction failed.')
    } finally {
      setExtracting(false)
    }
  }

  // ── Similarity score colour ───────────────────────────────────────────────
  const scoreColour = (pct) => {
    if (pct >= 60) return 'text-green-700 bg-green-50 border-green-200'
    if (pct >= 30) return 'text-yellow-700 bg-yellow-50 border-yellow-200'
    return 'text-gray-600 bg-gray-50 border-gray-200'
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/cases" className="hover:text-primary-700 hover:underline">All Cases</Link>
        <span>/</span>
        <Link to={`/cases/${id}`} className="hover:text-primary-700 hover:underline">
          {data?.targetCase?.caseNumber || `#${id}`}
        </Link>
        <span>/</span>
        <span className="text-gray-800 font-medium">Similar Judgments & Citations</span>
      </div>

      {/* Page header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="status text-primary-700">Similarity</span>
              <span className="text-xs text-gray-500">TF-IDF Cosine</span>
              {data?.targetCase && (
                <span className="text-xs text-gray-500 font-mono">
                  {data.targetCase.caseNumber}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Similar Judgments</h1>
            <p className="text-sm text-gray-500 mt-1">
              Textual keyword-based similarity search across your uploaded cases.
            </p>
          </div>
          <Link
            to={`/cases/${id}`}
            className="text-xs text-primary-700 hover:underline shrink-0"
          >
            ← Back to Case Details
          </Link>
        </div>
      </div>

      {/* ── Similar Judgments Section ─────────────────────────────────────── */}
      {loading ? (
        <div className="card text-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Calculating textual similarity…</p>
        </div>
      ) : error ? (
        <div className="card border-red-200 bg-red-50/40 text-center py-10">
          <p className="text-sm font-medium text-red-700">{error}</p>
          <button onClick={loadSimilar} className="btn-secondary text-xs mt-4">
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Disclaimer */}
          {data?.disclaimer && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
              <strong>Note:</strong> {data.disclaimer}
            </div>
          )}

          {data?.similar?.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">
                {data.message}
              </p>
              {data.similar.map((item) => (
                <div
                  key={item.id}
                  className="card hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded border ${scoreColour(item.similarityPercent)}`}
                      >
                        {item.similarityPercent}% similar
                      </span>
                      {item.caseType && (
                        <span className="text-xs text-gray-500">{item.caseType}</span>
                      )}
                    </div>

                    <h3 className="font-semibold text-gray-900 text-sm truncate">
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{item.caseNumber}</p>

                    {item.court && (
                      <p className="text-xs text-gray-500 mt-1">{item.court}</p>
                    )}
                    {item.judgmentDate && (
                      <p className="text-xs text-gray-500">
                        {new Date(item.judgmentDate).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </p>
                    )}

                    {item.matchingTopics?.length > 0 && (
                      <p className="text-xs text-gray-600 mt-2">
                        <span className="font-medium">Matching topics:</span>{' '}
                        {item.matchingTopics.map((t) => (
                          <span key={t} className="inline-block bg-primary-50 text-primary-700 rounded px-1 mr-1">
                            {t}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>

                  <Link
                    to={`/cases/${item.id}`}
                    className="btn-secondary text-xs shrink-0 self-start"
                  >
                    View Case →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="card flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-court-navy">No Similar Cases Found</h2>
                <p className="text-xs text-gray-500 mt-1">
                {data?.message ||
                  'Upload more digital judgments to enable similarity comparison across your case library.'}
                </p>
              </div>
              <Link to="/upload" className="btn-secondary text-xs shrink-0">⬆️ Upload Judgment</Link>
            </div>
          )}
        </>
      )}

      {/* ── Citations Section ─────────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className="font-semibold text-gray-900 text-base flex items-center gap-2">
            📚 Legal Citations Extracted
            {citations?.count != null && (
              <span className="text-sm font-normal text-gray-400">{citations.count}</span>
            )}
          </h2>
          <button
            onClick={handleExtractCitations}
            disabled={extracting}
            className="btn-secondary text-xs flex items-center gap-1"
          >
            {extracting ? (
              <>
                <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                Extracting…
              </>
            ) : '🔄 Extract / Re-extract Citations'}
          </button>
        </div>

        {citLoading ? (
          <div className="text-center py-8">
            <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-gray-500">Loading citations…</p>
          </div>
        ) : citError ? (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
            {citError}
          </div>
        ) : citations?.citations?.length > 0 ? (
          <>
            <p className="text-xs text-gray-500 mb-3">{citations.message}</p>
            <div className="divide-y divide-gray-100">
              {citations.citations.map((c, idx) => (
                <div key={c.id || idx} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 font-mono break-words">
                      {c.citation}
                    </p>
                    {c.context && (
                      <p className="text-xs text-gray-500 mt-0.5 italic leading-relaxed">
                        {c.context}
                      </p>
                    )}
                  </div>
                  <span className={`${{ case_law: 'badge-case', case_name: 'badge-case', statute: 'badge-act', section: 'badge-section' }[c.type] || 'badge-gray'} shrink-0`}>
                    {{ case_law: 'Case', case_name: 'Case', statute: 'Act', section: 'Section' }[c.type] || 'Citation'}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-3">
            <p className="text-sm font-medium text-gray-800">No citations extracted yet</p>
            <p className="text-xs text-gray-500 mt-1">
              {citations?.message ||
                'Click "Extract Citations" above to scan this judgment for legal references.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
