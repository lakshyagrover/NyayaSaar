import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../services/api.js'

const STATUS_BADGE = {
  PENDING:    'badge-yellow',
  PROCESSING: 'badge-blue',
  COMPLETED:  'badge-green',
  FAILED:     'badge-red',
}

export default function CaseDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [caseData, setCaseData]       = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [feedback, setFeedback]       = useState(null)

  // Edit modal state
  const [showEdit, setShowEdit]       = useState(false)
  const [saving, setSaving]           = useState(false)
  const [reExtracting, setReExtracting]   = useState(false)
  const [citations, setCitations]         = useState(null)
  const [citLoading, setCitLoading]       = useState(false)
  const [extractingCit, setExtractingCit] = useState(false)
  const [editForm, setEditForm]       = useState({
    title: '',
    caseNumber: '',
    court: '',
    judgmentDate: '',
    caseType: '',
    status: '',
    extractedText: '',
  })

  // Fetch case details
  const fetchCase = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/cases/${id}`)
      const c = res.data.case
      setCaseData(c)
      setEditForm({
        title: c.title || '',
        caseNumber: c.caseNumber || '',
        court: c.court || '',
        judgmentDate: c.judgmentDate ? c.judgmentDate.slice(0, 10) : '',
        caseType: c.caseType || 'Civil',
        status: c.status || 'PENDING',
        extractedText: c.extractedText || '',
      })
    } catch (err) {
      console.error('Failed to load case:', err)
      setError(
        err.response?.status === 404
          ? 'Case not found or you do not have permission to view it.'
          : err.response?.data?.message || 'Failed to load case details.',
      )
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchCase()
  }, [fetchCase])

  // Load stored citations whenever case loads
  const fetchCitations = useCallback(async () => {
    setCitLoading(true)
    try {
      const res = await api.get(`/citations/${id}`)
      setCitations(res.data)
    } catch {
      // non-critical — silently ignore
    } finally {
      setCitLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchCitations()
  }, [fetchCitations])

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)

    try {
      const res = await api.put(`/cases/${id}`, editForm)
      setCaseData(res.data.case)
      setShowEdit(false)
      setFeedback({ type: 'success', text: 'Case updated successfully.' })
    } catch (err) {
      console.error('Failed to update case:', err)
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update case.',
      })
    } finally {
      setSaving(false)
    }
  }

  // Handle Delete
  const handleDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete case "${caseData?.caseNumber}"? All linked records will be permanently removed.`,
      )
    ) {
      return
    }

    try {
      await api.delete(`/cases/${id}`)
      navigate('/cases', { replace: true })
    } catch (err) {
      console.error('Failed to delete case:', err)
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || 'Failed to delete case.',
      })
    }
  }

  // Handle safe re-extraction
  const handleReExtract = async () => {
    setReExtracting(true)
    setFeedback(null)
    try {
      const res = await api.post(`/cases/${id}/re-extract`)
      if (res.data.case) {
        setCaseData(res.data.case)
      }
      setFeedback({
        type: 'success',
        text: res.data.message || 'Digital text re-extracted successfully.',
      })
    } catch (err) {
      console.error('Re-extraction failed:', err)
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || 'Failed to re-extract digital text from PDF.',
      })
    } finally {
      setReExtracting(false)
    }
  }

  // Handle citation extraction
  const handleExtractCitations = async () => {
    setExtractingCit(true)
    setFeedback(null)
    try {
      const res = await api.post(`/citations/${id}`)
      setCitations(res.data)
      setFeedback({
        type: 'success',
        text: res.data.message || `${res.data.count} citation(s) extracted.`,
      })
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || 'Citation extraction failed.',
      })
    } finally {
      setExtractingCit(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  if (loading) {
    return (
      <div className="card text-center py-20">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500 font-medium">Loading case details…</p>
      </div>
    )
  }

  if (error || !caseData) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link to="/cases" className="hover:text-primary-700">
            ← Back to All Cases
          </Link>
        </div>
        <div className="card text-center py-16 border-red-200 bg-red-50/50">
          <span className="text-4xl mb-3 block">⚠️</span>
          <h2 className="text-lg font-bold text-red-800">Error Loading Case</h2>
          <p className="text-sm text-red-600 mt-1 max-w-md mx-auto">{error}</p>
          <div className="mt-5">
            <Link to="/cases" className="btn-primary">
              Return to Cases List
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const formattedJudgmentDate = caseData.judgmentDate
    ? new Date(caseData.judgmentDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Not Specified'

  const formattedCreatedDate = new Date(caseData.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  const primaryDocument = caseData.documents?.[0] || null

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link to="/cases" className="hover:text-primary-700 hover:underline">
            All Cases
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium font-mono text-xs">
            {caseData.caseNumber}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowEdit(true)} className="btn-secondary text-xs">
            ✏️ Edit Case
          </button>
          <button onClick={handleDelete} className="btn-danger text-xs">
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* User Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-lg text-sm flex items-center justify-between ${
            feedback.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="font-bold ml-4 hover:opacity-75"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Overview Card */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2.5 mb-2 flex-wrap">
              <span className="font-mono text-xs px-2.5 py-1 bg-gray-100 text-gray-800 rounded font-semibold">
                {caseData.caseNumber}
              </span>
              <span
                className={
                  STATUS_BADGE[caseData.status?.toUpperCase()] || 'badge-gray'
                }
              >
                {caseData.status}
              </span>
              <span className="badge badge-gray">{caseData.caseType || 'General'}</span>
              {caseData.extractedText ? (
                <span className="badge badge-green">✓ Text Extracted</span>
              ) : (
                <span className="badge badge-yellow">OCR Pending</span>
              )}
              {caseData.summary ? (
                <span className="badge badge-blue">✓ AI Summary Ready</span>
              ) : null}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 font-serif">
              {caseData.title}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {caseData.court || 'Court not specified'}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap shrink-0">
            <Link to={`/cases/${id}/summary`} className="btn-primary">
              🤖 View AI Summary
            </Link>
            <Link to={`/cases/${id}/similar`} className="btn-secondary">
              🔍 Similar Judgments
            </Link>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-3.5">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
              Judgment Date
            </p>
            <p className="font-semibold text-gray-900 mt-1 text-sm">
              {formattedJudgmentDate}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3.5">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
              Court Jurisdiction
            </p>
            <p className="font-semibold text-gray-900 mt-1 text-sm truncate">
              {caseData.court || '—'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3.5">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
              Case Category
            </p>
            <p className="font-semibold text-gray-900 mt-1 text-sm">
              {caseData.caseType || 'General'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3.5">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
              Added to System
            </p>
            <p className="font-semibold text-gray-900 mt-1 text-sm">
              {formattedCreatedDate}
            </p>
          </div>
        </div>
      </div>

      {/* Linked Assets Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card flex items-center gap-3">
          <span className="text-3xl">📄</span>
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium">Attached Documents</p>
            <p className="text-lg font-bold text-gray-900">
              {caseData._count?.documents ?? caseData.documents?.length ?? 0} files
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <span className="text-3xl">⚖️</span>
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium">Citations</p>
            <p className="text-lg font-bold text-gray-900">
              {caseData._count?.citations ?? caseData.citations?.length ?? 0} cited
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <span className="text-3xl">📅</span>
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium">Hearings</p>
            <p className="text-lg font-bold text-gray-900">
              {caseData._count?.hearings ?? caseData.hearings?.length ?? 0} scheduled
            </p>
          </div>
        </div>
      </div>

      {/* Attached PDF Document Card */}
      {primaryDocument && (
        <div className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-primary-50/30 border-primary-200">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📑</span>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {primaryDocument.fileName || caseData.pdfFileName || 'Judgment PDF'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatFileSize(primaryDocument.fileSize)} • Stored securely outside public webroot
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleReExtract}
              disabled={reExtracting}
              className="btn-secondary text-xs flex items-center gap-1"
            >
              {reExtracting ? 'Extracting…' : '🔄 Re-extract Digital Text'}
            </button>
            <a
              href={`http://localhost:3000/api/documents/${primaryDocument.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs"
            >
              📥 View / Download Stored PDF
            </a>
          </div>
        </div>
      )}

      {/* When no document is attached */}
      {!primaryDocument && (
        <div className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-amber-50/40 border-amber-200">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-amber-900">No PDF Document Attached</p>
              <p className="text-xs text-amber-700 mt-0.5">
                This case record was created without an attached PDF file.
              </p>
            </div>
          </div>
          <Link to="/upload" className="btn-primary text-xs">
            📤 Upload Judgment PDF
          </Link>
        </div>
      )}

      {/* Extracted Text Preview Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 text-base flex items-center gap-2">
            <span>📝</span> Extracted Judgment Text
          </h2>
          <div className="flex items-center gap-2">
            {primaryDocument && (
              <button
                onClick={handleReExtract}
                disabled={reExtracting}
                className="text-xs text-primary-700 hover:underline flex items-center gap-1"
              >
                {reExtracting ? 'Extracting…' : '🔄 Re-extract'}
              </button>
            )}
            {caseData.extractedText && (
              <span className="text-xs text-gray-500 font-mono">
                {caseData.extractedText.length.toLocaleString()} characters
              </span>
            )}
          </div>
        </div>

        {caseData.extractedText ? (
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs text-gray-800 max-h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-gray-200">
            {caseData.extractedText}
          </div>
        ) : (
          <div className="bg-amber-50/50 rounded-lg p-8 text-center text-amber-800 border border-amber-200">
            <span className="text-3xl block mb-2">🔍</span>
            <p className="text-sm font-semibold">Digital text layer not detected (Scanned Document)</p>
            <p className="text-xs text-amber-700 mt-1 max-w-md mx-auto">
              This document consists of scanned images without a standard digital text stream. It has been registered and marked as <strong>OCR Pending</strong> for future OCR processing.
            </p>
            {primaryDocument && (
              <div className="mt-4">
                <button
                  onClick={handleReExtract}
                  disabled={reExtracting}
                  className="btn-secondary text-xs"
                >
                  {reExtracting ? 'Extracting…' : '🔄 Try Re-extracting Digital Text'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Citations Card */}
      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className="font-semibold text-gray-900 text-base flex items-center gap-2">
            📚 Legal Citations
            {citations?.count != null && (
              <span className="badge badge-gray">{citations.count}</span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExtractCitations}
              disabled={extractingCit || !caseData?.extractedText}
              title={!caseData?.extractedText ? 'Upload a digital PDF first to extract citations' : ''}
              className="btn-secondary text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {extractingCit ? (
                <>
                  <span className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  Extracting…
                </>
              ) : '🔄 Extract Citations'}
            </button>
          </div>
        </div>

        {citLoading ? (
          <div className="text-center py-6">
            <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-gray-500">Loading citations…</p>
          </div>
        ) : citations?.citations?.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {citations.citations.map((c, idx) => (
              <div key={c.id || idx} className="py-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 font-mono break-words">{c.citation}</p>
                  {c.context && (
                    <p className="text-xs text-gray-500 mt-0.5 italic">{c.context}</p>
                  )}
                </div>
                <span className="badge badge-gray text-[10px] uppercase tracking-wider shrink-0">
                  {c.type || 'citation'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">📄</p>
            <p className="text-sm text-gray-500">
              {!caseData?.extractedText
                ? 'Upload a digital PDF to enable citation extraction.'
                : citations?.message || 'No citations found. Click "Extract Citations" to scan this judgment.'}
            </p>
          </div>
        )}
      </div>

      {/* Edit Modal */}      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Edit Case Details</h2>
              <button
                onClick={() => setShowEdit(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="form-label">Case Title *</label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Case Number *</label>
                  <input
                    type="text"
                    required
                    value={editForm.caseNumber}
                    onChange={(e) => setEditForm({ ...editForm, caseNumber: e.target.value })}
                    className="form-input font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="form-label">Case Type</label>
                  <input
                    type="text"
                    value={editForm.caseType}
                    onChange={(e) => setEditForm({ ...editForm, caseType: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Court</label>
                  <input
                    type="text"
                    value={editForm.court}
                    onChange={(e) => setEditForm({ ...editForm, court: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Judgment Date</label>
                  <input
                    type="date"
                    value={editForm.judgmentDate}
                    onChange={(e) => setEditForm({ ...editForm, judgmentDate: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="form-input"
                >
                  <option value="PENDING">Pending</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>

              <div>
                <label className="form-label">Extracted Judgment Text</label>
                <textarea
                  rows={6}
                  value={editForm.extractedText}
                  onChange={(e) => setEditForm({ ...editForm, extractedText: e.target.value })}
                  placeholder="Paste legal judgment or order text here…"
                  className="form-input font-mono text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="btn-secondary"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Saving Changes…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
