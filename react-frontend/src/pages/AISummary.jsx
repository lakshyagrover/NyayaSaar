import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api.js'

export default function AISummary() {
  const { id } = useParams()

  const [caseData, setCaseData] = useState(null)
  const [summary, setSummary] = useState(null)
  const [citations, setCitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [errorCode, setErrorCode] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Fetch initial case and existing summary
  const loadCaseAndSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    setErrorCode(null)
    try {
      // 1. Fetch case record — this is the critical step; if it fails, show error
      const caseRes = await api.get(`/cases/${id}`)
      const c = caseRes.data.case
      setCaseData(c)

      // 2. Fetch existing summary — handled separately so a missing summary
      //    doesn't trigger the page-level error state
      try {
        const sumRes = await api.get(`/summarize?caseId=${id}`)
        if (sumRes.data?.summary) {
          setSummary(sumRes.data.summary)
          setCitations(sumRes.data.citations || c.citations || [])
        } else {
          setSummary(null)
          setCitations(c.citations || [])
        }
      } catch (sumErr) {
        // A missing summary (200 with null) or any summary fetch error
        // should NOT crash the page — just show empty state
        console.warn('Could not load existing summary:', sumErr?.response?.data?.message || sumErr.message)
        setSummary(null)
        setCitations(c.citations || [])
      }
    } catch (err) {
      console.error('Failed to load case:', err)
      const msg =
        err.response?.status === 404
          ? 'Case not found or you do not have permission to view it.'
          : err.response?.data?.message || 'Failed to load case information.'
      setError(msg)
      setErrorCode(err.response?.data?.code || null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadCaseAndSummary()
  }, [loadCaseAndSummary])

  // Generate or Regenerate Summary
  const handleGenerate = async (force = false) => {
    setGenerating(true)
    setError(null)
    setErrorCode(null)
    setSuccessMsg(null)

    try {
      const res = await api.post('/summarize', {
        caseId: id,
        forceRegenerate: force,
      })

      if (res.data?.summary) {
        setSummary(res.data.summary)
        if (res.data.citations) {
          setCitations(res.data.citations)
        }
        setSuccessMsg(
          res.data.isExisting
            ? 'Existing summary loaded.'
            : 'AI Summary generated successfully.'
        )
      }
    } catch (err) {
      console.error('Failed to generate summary:', err)
      const data = err.response?.data
      setError(data?.message || 'Failed to generate summary. Please try again.')
      setErrorCode(data?.code || null)
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="card text-center py-20">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500 font-medium">Loading judgment details…</p>
      </div>
    )
  }

  const hasExtractedText = Boolean(
    caseData?.extractedText?.trim() || caseData?.documents?.some((d) => d.extractedText?.trim())
  )

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link to="/cases" className="hover:text-primary-700 hover:underline">
            All Cases
          </Link>
          <span>/</span>
          <Link to={`/cases/${id}`} className="hover:text-primary-700 hover:underline font-mono text-xs">
            {caseData?.caseNumber || `#${id}`}
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">AI Summary</span>
        </div>
        <Link to={`/cases/${id}`} className="text-xs text-primary-700 hover:underline flex items-center gap-1">
          ← Back to Case Details
        </Link>
      </div>

      {/* Header Overview Card */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="badge badge-blue">Groq AI</span>
              <span className="badge badge-gray">{caseData?.caseNumber}</span>
              {hasExtractedText ? (
                <span className="badge badge-green">✓ Extracted Text Available</span>
              ) : (
                <span className="badge badge-yellow">⚠️ OCR Pending</span>
              )}
              {summary && (
                <span className="badge badge-green">Summary Active</span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 font-serif">
              {caseData?.title || 'Court Judgment'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {caseData?.court || 'District Court'} • Judgment Date:{' '}
              {caseData?.judgmentDate
                ? new Date(caseData.judgmentDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Not specified'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {summary ? (
              <button
                onClick={() => handleGenerate(true)}
                disabled={generating || !hasExtractedText}
                className="btn-secondary text-xs flex items-center gap-1.5"
                title="Regenerate this summary"
              >
                {generating ? 'Regenerating…' : '🔄 Regenerate Summary'}
              </button>
            ) : (
              <button
                onClick={() => handleGenerate(false)}
                disabled={generating || !hasExtractedText}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                {generating ? 'Analyzing Judgment…' : '⚡ Generate AI Summary'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 rounded-xl text-sm bg-green-50 text-green-800 border border-green-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-green-800 font-bold ml-4 hover:opacity-75">
            ✕
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div
          className={`p-5 rounded-xl text-sm border ${
            errorCode === 'NO_EXTRACTED_TEXT'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : errorCode === 'API_KEY_NOT_CONFIGURED'
              ? 'bg-purple-50 border-purple-300 text-purple-900'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">
              {errorCode === 'NO_EXTRACTED_TEXT'
                ? '📄'
                : errorCode === 'API_KEY_NOT_CONFIGURED'
                ? '🔑'
                : '⚠️'}
            </span>
            <div className="flex-1">
              <h3 className="font-bold text-sm">
                {errorCode === 'NO_EXTRACTED_TEXT'
                  ? 'Digital Text Layer Missing (Scanned PDF)'
                  : errorCode === 'API_KEY_NOT_CONFIGURED'
                  ? 'Groq API Key Required'
                  : 'AI Summarization Notice'}
              </h3>
              <p className="mt-1 text-xs leading-relaxed">{error}</p>

              {errorCode === 'NO_EXTRACTED_TEXT' && (
                <div className="mt-3">
                  <Link
                    to={`/cases/${id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 underline hover:text-amber-900"
                  >
                    Go to Case Details to inspect or enter judgment text →
                  </Link>
                </div>
              )}

              {errorCode === 'API_KEY_NOT_CONFIGURED' && (
                <p className="mt-2 text-xs font-mono bg-purple-100/70 p-2 rounded text-purple-800">
                  Add GROQ_API_KEY=your_key to next-backend/.env and restart the backend server.
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setError(null)
                setErrorCode(null)
              }}
              className="text-gray-500 hover:text-gray-700 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Generating State Banner */}
      {generating && (
        <div className="card text-center py-12 border-primary-200 bg-primary-50/20">
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900">Analyzing Judgment with AI</h2>
          <p className="text-xs text-gray-600 mt-1 max-w-md mx-auto">
            Extracting facts, legal issues, arguments, ratio decidendi, and operative orders… Long judgments can take a few minutes. Please keep this page open.
          </p>
        </div>
      )}

      {/* Summary Content */}
      {summary ? (
        <div className="space-y-6">
          {/* Legal AI Disclaimer Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 flex items-start gap-3">
            <span className="text-lg">⚖️</span>
            <div>
              <p className="font-semibold">Legal Study Aid & Research Disclaimer</p>
              <p className="mt-0.5 text-blue-800 leading-relaxed">
                {summary.disclaimer ||
                  'This summary is an AI-generated study aid designed for legal research and educational reference. It does not constitute formal legal advice.'}
              </p>
              <p className="text-[11px] text-blue-600 mt-1">
                Model: <span className="font-mono font-medium">{summary.model || 'openai/gpt-oss-120b'}</span> • Generated on:{' '}
                {summary.generatedAt ? new Date(summary.generatedAt).toLocaleString() : 'Just now'}
              </p>
            </div>
          </div>

          {/* 8 Structured Legal Summary Sections */}
          <div className="grid grid-cols-1 gap-5">
            {/* 1. Case Overview */}
            <div className="card border-l-4 border-l-primary-600">
              <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-base">
                <span>📌</span> 1. Case Overview
              </h2>
              <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                {summary.caseOverview}
              </div>
            </div>

            {/* 2. Important Facts */}
            <div className="card border-l-4 border-l-blue-600">
              <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-base">
                <span>📋</span> 2. Important Material Facts
              </h2>
              <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                {summary.importantFacts}
              </div>
            </div>

            {/* 3. Legal Issues */}
            <div className="card border-l-4 border-l-amber-500">
              <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-base">
                <span>⚖️</span> 3. Legal Issues & Questions of Law Framed
              </h2>
              <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                {summary.legalIssues}
              </div>
            </div>

            {/* 4. Arguments of Petitioner / Appellant */}
            <div className="card border-l-4 border-l-indigo-600">
              <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-base">
                <span>🗣️</span> 4. Arguments of the Petitioner / Appellant
              </h2>
              <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                {summary.petitionerArguments}
              </div>
            </div>

            {/* 5. Arguments of Respondent */}
            <div className="card border-l-4 border-l-teal-600">
              <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-base">
                <span>🛡️</span> 5. Arguments of the Respondent / Defendant
              </h2>
              <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                {summary.respondentArguments}
              </div>
            </div>

            {/* 6. Court's Reasoning */}
            <div className="card border-l-4 border-l-purple-600">
              <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-base">
                <span>🏛️</span> 6. Court’s Findings & Legal Reasoning
              </h2>
              <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                {summary.courtReasoning}
              </div>
            </div>

            {/* 7. Final Judgment / Decision */}
            <div className="card border-l-4 border-l-emerald-600 bg-emerald-50/10">
              <h2 className="font-semibold text-emerald-950 mb-2 flex items-center gap-2 text-base">
                <span>📜</span> 7. Final Judgment & Operative Order
              </h2>
              <div className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap font-medium">
                {summary.finalDecision}
              </div>
            </div>

            {/* 8. Important Legal Principles */}
            <div className="card border-l-4 border-l-yellow-500">
              <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-base">
                <span>💡</span> 8. Important Legal Principles & Ratio Decidendi
              </h2>
              <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                {summary.legalPrinciples}
              </div>
            </div>
          </div>

          {/* Citations List */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-base">
              <span>📚</span> Legal Citations & Precedents Identified ({citations.length})
            </h2>
            {citations.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {citations.map((c, index) => (
                  <div key={c.id || index} className="py-2.5 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 font-mono">
                        {c.citation}
                      </p>
                      {c.context && (
                        <p className="text-xs text-gray-500 mt-0.5">{c.context}</p>
                      )}
                    </div>
                    <span className="badge badge-gray text-[10px] uppercase tracking-wider shrink-0">
                      {{ case_law: 'Case', case_name: 'Case', statute: 'Act', section: 'Section' }[c.type] || 'Citation'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">
                No external precedent citations or statutory citations were flagged in this judgment text.
              </p>
            )}
          </div>
        </div>
      ) : !generating ? (
        /* Empty State */
        <div className="card text-center py-16 border-dashed border-2 border-gray-200">
          <span className="text-4xl block mb-3">⚖️</span>
          <h2 className="text-lg font-bold text-gray-900">No Summary Generated Yet</h2>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            Generate an AI-powered structured case brief highlighting facts, issues, arguments, reasoning, and final decisions using AI.
          </p>

          <div className="mt-6">
            {hasExtractedText ? (
              <button
                onClick={() => handleGenerate(false)}
                disabled={generating}
                className="btn-primary text-sm flex items-center gap-2 mx-auto"
              >
                ⚡ Generate AI Summary Now
              </button>
            ) : (
              <div className="inline-block p-3 rounded-lg bg-amber-50 text-amber-800 text-xs border border-amber-200">
                Judgment text is not available (OCR Pending). Please upload a digital PDF or edit the case text to generate a summary.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
