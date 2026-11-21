import { useState } from 'react'

export default function UploadJudgment() {
  const [file, setFile]       = useState(null)
  const [form, setForm]       = useState({ title: '', caseNumber: '', court: '', date: '' })
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState(null)

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (f && f.type === 'application/pdf') setFile(f)
    else { setFile(null); setMessage({ type: 'error', text: 'Only PDF files are allowed.' }) }
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) { setMessage({ type: 'error', text: 'Please select a PDF file.' }); return }
    setUploading(true)
    setMessage(null)
    // TODO: Call POST /api/upload with FormData
    setTimeout(() => {
      setMessage({ type: 'success', text: 'Judgment uploaded! (API not yet connected)' })
      setUploading(false)
    }, 1200)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Judgment</h1>
        <p className="mt-1 text-sm text-gray-500">Upload a PDF judgment for AI-powered summarization.</p>
      </div>

      <div className="card">
        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200'
                                     : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* PDF drop zone */}
          <div>
            <label className="form-label">Judgment PDF *</label>
            <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors">
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <span className="text-3xl">📄</span>
                {file
                  ? <span className="text-sm font-medium text-primary-700">{file.name}</span>
                  : <><span className="text-sm font-medium">Click to select PDF</span>
                     <span className="text-xs">PDF files only, max 50 MB</span></>
                }
              </div>
              <input type="file" accept="application/pdf" className="hidden" onChange={handleFile} />
            </label>
          </div>

          <div>
            <label htmlFor="title" className="form-label">Case Title *</label>
            <input id="title" name="title" value={form.title} onChange={handleChange}
              required className="form-input" placeholder="State vs. John Doe" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="caseNumber" className="form-label">Case Number *</label>
              <input id="caseNumber" name="caseNumber" value={form.caseNumber} onChange={handleChange}
                required className="form-input" placeholder="CR-2024-001234" />
            </div>
            <div>
              <label htmlFor="date" className="form-label">Judgment Date *</label>
              <input id="date" name="date" type="date" value={form.date} onChange={handleChange}
                required className="form-input" />
            </div>
          </div>

          <div>
            <label htmlFor="court" className="form-label">Court Name</label>
            <input id="court" name="court" value={form.court} onChange={handleChange}
              className="form-input" placeholder="District Court, New Delhi" />
          </div>

          <button type="submit" disabled={uploading} className="btn-primary w-full">
            {uploading ? 'Uploading…' : 'Upload & Process Judgment'}
          </button>
        </form>
      </div>
    </div>
  )
}
