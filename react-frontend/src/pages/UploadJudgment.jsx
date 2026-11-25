import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api.js'

const MAX_SIZE_MB = 20
const MAX_BYTES = MAX_SIZE_MB * 1024 * 1024

export default function UploadJudgment() {
  const navigate = useNavigate()
  const [file, setFile]                   = useState(null)
  const [form, setForm]                   = useState({
    title: '',
    caseNumber: '',
    court: '',
    date: '',
    caseType: 'Criminal',
  })
  const [uploading, setUploading]         = useState(false)
  const [processingStep, setProcessingStep] = useState('')
  const [error, setError]                 = useState(null)
  const [result, setResult]               = useState(null)

  const handleFileChange = (e) => {
    setError(null)
    const selected = e.target.files?.[0]
    if (!selected) return

    if (!selected.name.toLowerCase().endsWith('.pdf') || (selected.type && selected.type !== 'application/pdf')) {
      setFile(null)
      setError('Only PDF files are supported. Please select a valid .pdf judgment file.')
      return
    }

    if (selected.size === 0) {
      setFile(null)
      setError('The selected file is empty (0 bytes).')
      return
    }

    if (selected.size > MAX_BYTES) {
      setFile(null)
      setError(`File size (${(selected.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed limit of ${MAX_SIZE_MB} MB.`)
      return
    }

    setFile(selected)
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setResult(null)

    if (!file) {
      setError('Please select a PDF judgment file to upload.')
      return
    }

    if (!form.title.trim() || !form.caseNumber.trim()) {
      setError('Case Title and Case Number are required.')
      return
    }

    setUploading(true)
    setProcessingStep('Uploading PDF document to secure server…')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', form.title.trim())
      formData.append('caseNumber', form.caseNumber.trim())
      formData.append('court', form.court.trim())
      formData.append('date', form.date)
      formData.append('caseType', form.caseType)

      setProcessingStep('Extracting legal judgment text with parser…')

      const res = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      const data = res.data
      setResult(data)
      setProcessingStep('Completed! Redirecting to Case Details…')

      // Short delay so the user can see the extraction status before redirect
      setTimeout(() => {
        if (data.case?.id) {
          navigate(`/cases/${data.case.id}`)
        }
      }, 2200)
    } catch (err) {
      console.error('Upload failed:', err)
      setError(err.response?.data?.message || 'Failed to upload and process PDF judgment.')
      setUploading(false)
      setProcessingStep('')
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link to="/cases" className="text-xs text-primary-700 hover:underline">
          ← All Cases
        </Link>
        <h1 className="text-3xl font-bold text-court-navy mt-2">Upload Judgment</h1>
        <p className="mt-1 text-sm text-gray-500">
          Add a judgment PDF. We extract the text so you can generate an AI summary.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
          <span className="text-base shrink-0">⚠️</span>
          <div className="flex-1">
            <p className="font-semibold">Upload failed</p>
            <p className="mt-0.5">{error}</p>
          </div>
          <button type="button" onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Success Alert */}
      {result && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">✅ Uploaded successfully</p>
            <Link to={`/cases/${result.case?.id}`} className="btn-primary text-xs py-1.5 px-3">
              Go to Case →
            </Link>
          </div>
          <p className="mt-2 text-xs">
            {result.extraction?.hasExtractedText
              ? `${result.extraction.textLength.toLocaleString()} characters extracted.`
              : 'Scanned PDF detected (no text layer found).'}
          </p>
          <p className="text-xs text-green-700 mt-1 animate-pulse">{processingStep}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-0 overflow-hidden">
        {/* Step 1: PDF */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-base font-semibold text-court-navy">1. Judgment PDF</h2>
          <p className="text-xs text-gray-500 mb-4">PDF only, up to {MAX_SIZE_MB} MB.</p>

          <label
            className={`flex flex-col items-center justify-center w-full h-44 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
              file
                ? 'border-primary-400 bg-primary-50'
                : 'border-gray-200 bg-gray-50 hover:border-primary-300 hover:bg-primary-50'
            } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <div className="w-12 h-12 rounded-full bg-white border border-primary-100 flex items-center justify-center text-2xl mb-2">
              {file ? '📑' : '📄'}
            </div>
            {file ? (
              <>
                <p className="text-sm font-semibold text-primary-800 px-4 text-center break-all">{file.name}</p>
                <p className="text-xs text-gray-500 mt-1">{formatFileSize(file.size)} · Click to change</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700">Click to choose a PDF</p>
                <p className="text-xs text-gray-400 mt-1">or drag and drop it here</p>
              </>
            )}
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              disabled={uploading}
              onChange={handleFileChange}
            />
          </label>
        </div>

        {/* Step 2: Case details */}
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-court-navy">2. Case Details</h2>
            <p className="text-xs text-gray-500">Fields marked * are required.</p>
          </div>

          <div>
            <label htmlFor="title" className="form-label">Case Title / Parties *</label>
            <input
              id="title" name="title" value={form.title} onChange={handleChange}
              disabled={uploading} required className="form-input"
              placeholder="e.g. State vs. Ramesh Kumar & Ors."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="caseNumber" className="form-label">Case Number / FIR No. *</label>
              <input
                id="caseNumber" name="caseNumber" value={form.caseNumber} onChange={handleChange}
                disabled={uploading} required className="form-input"
                placeholder="e.g. CRL-A-2024-0418"
              />
            </div>
            <div>
              <label htmlFor="caseType" className="form-label">Case Category</label>
              <select
                id="caseType" name="caseType" value={form.caseType} onChange={handleChange}
                disabled={uploading} className="form-input"
              >
                <option value="Criminal">Criminal</option>
                <option value="Civil">Civil</option>
                <option value="Constitutional">Constitutional</option>
                <option value="Commercial">Commercial</option>
                <option value="Family">Family</option>
                <option value="Revenue">Revenue</option>
              </select>
            </div>
            <div>
              <label htmlFor="date" className="form-label">Judgment Date</label>
              <input
                id="date" name="date" type="date" value={form.date} onChange={handleChange}
                disabled={uploading} className="form-input"
              />
            </div>
            <div>
              <label htmlFor="court" className="form-label">Court</label>
              <input
                id="court" name="court" value={form.court} onChange={handleChange}
                disabled={uploading} className="form-input"
                placeholder="e.g. Tis Hazari District Court, Delhi"
              />
            </div>
          </div>
        </div>

        {/* Processing Indicator */}
        {uploading && (
          <div className="mx-6 mb-4 p-3 bg-primary-50 rounded-lg border border-primary-100 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary-700 border-t-transparent rounded-full animate-spin shrink-0" />
            <p className="text-xs font-medium text-primary-800">{processingStep}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            type="button" onClick={() => navigate('/cases')} disabled={uploading}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button type="submit" disabled={uploading || !file} className="btn-primary px-6">
            {uploading ? 'Processing…' : 'Upload & Extract'}
          </button>
        </div>
      </form>
    </div>
  )
}
