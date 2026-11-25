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
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Upload Judgment</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload a district court PDF judgment to extract full text and index legal metadata.
          </p>
        </div>
        <Link to="/cases" className="btn-secondary text-xs">
          ← All Cases
        </Link>
      </div>

      <div className="card">
        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
            <span className="text-base shrink-0">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold">Upload failed</p>
              <p className="mt-0.5">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Success Alert */}
        {result && (
          <div className="mb-5 p-4 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-base">
                ✅ Upload &amp; Extraction Successful!
              </span>
              <Link
                to={`/cases/${result.case?.id}`}
                className="btn-primary text-xs py-1 px-3"
              >
                Go to Case Now →
              </Link>
            </div>
            <div className="text-xs bg-white/80 p-2.5 rounded border border-green-200">
              <p>
                <strong>Case Number:</strong> {result.case?.caseNumber}
              </p>
              <p>
                <strong>Text Extraction Status:</strong>{' '}
                {result.extraction?.hasExtractedText ? (
                  <span className="text-green-700 font-semibold">
                    {result.extraction.textLength.toLocaleString()} characters extracted
                  </span>
                ) : (
                  <span className="text-amber-700 font-semibold">
                    Scanned PDF detected (marked for OCR)
                  </span>
                )}
              </p>
              <p className="text-gray-500 mt-1 italic">{result.extraction?.message}</p>
            </div>
            <p className="text-xs text-green-700 animate-pulse font-medium">
              {processingStep}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* PDF Drag & Drop / Selection Area */}
          <div>
            <label className="form-label font-semibold">
              Judgment PDF File * <span className="text-xs font-normal text-gray-500">(Max 20 MB)</span>
            </label>
            <label
              className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
                file
                  ? 'border-primary-500 bg-primary-50/40'
                  : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
              } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <div className="flex flex-col items-center gap-2 text-center p-4">
                <span className="text-4xl">{file ? '📑' : '📄'}</span>
                {file ? (
                  <div>
                    <p className="text-sm font-semibold text-primary-900">{file.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatFileSize(file.size)} • Click to replace file
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-700">
                      Click to browse or drop your judgment PDF here
                    </p>
                    <p className="text-xs text-gray-400">Standard PDF format with selectable or scanned text</p>
                  </>
                )}
              </div>
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                disabled={uploading}
                onChange={handleFileChange}
              />
            </label>
          </div>

          {/* Case Title */}
          <div>
            <label htmlFor="title" className="form-label font-semibold">
              Case Title / Parties *
            </label>
            <input
              id="title"
              name="title"
              value={form.title}
              onChange={handleChange}
              disabled={uploading}
              required
              className="form-input"
              placeholder="e.g. State vs. Ramesh Kumar &amp; Ors."
            />
          </div>

          {/* Case Number & Case Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="caseNumber" className="form-label font-semibold">
                Case Number / FIR No. *
              </label>
              <input
                id="caseNumber"
                name="caseNumber"
                value={form.caseNumber}
                onChange={handleChange}
                disabled={uploading}
                required
                className="form-input font-mono text-xs"
                placeholder="e.g. CRL-A-2024-0418"
              />
            </div>
            <div>
              <label htmlFor="caseType" className="form-label font-semibold">
                Case Category
              </label>
              <select
                id="caseType"
                name="caseType"
                value={form.caseType}
                onChange={handleChange}
                disabled={uploading}
                className="form-input"
              >
                <option value="Criminal">Criminal</option>
                <option value="Civil">Civil</option>
                <option value="Constitutional">Constitutional</option>
                <option value="Commercial">Commercial</option>
                <option value="Family">Family</option>
                <option value="Revenue">Revenue</option>
              </select>
            </div>
          </div>

          {/* Judgment Date & Court Jurisdiction */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className="form-label font-semibold">
                Judgment Date
              </label>
              <input
                id="date"
                name="date"
                type="date"
                value={form.date}
                onChange={handleChange}
                disabled={uploading}
                className="form-input"
              />
            </div>
            <div>
              <label htmlFor="court" className="form-label font-semibold">
                Court Jurisdiction
              </label>
              <input
                id="court"
                name="court"
                value={form.court}
                onChange={handleChange}
                disabled={uploading}
                className="form-input"
                placeholder="e.g. Tis Hazari District Court, Delhi"
              />
            </div>
          </div>

          {/* Processing Indicator */}
          {uploading && (
            <div className="p-4 bg-primary-50 rounded-lg border border-primary-200 flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-primary-700 border-t-transparent rounded-full animate-spin shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-primary-900">{processingStep}</p>
                <p className="text-xs text-primary-700 mt-0.5">
                  Please keep this page open while the PDF is parsed and registered.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={uploading || !file}
              className="btn-primary flex-1 py-2.5 font-semibold text-sm"
            >
              {uploading ? 'Processing Judgment…' : 'Upload & Extract Judgment'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/cases')}
              disabled={uploading}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
