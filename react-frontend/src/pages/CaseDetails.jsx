import { useParams, Link } from 'react-router-dom'

export default function CaseDetails() {
  const { id } = useParams()
  // TODO: Fetch case from GET /api/cases/:id

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/cases" className="hover:text-primary-700">All Cases</Link>
        <span>/</span>
        <span className="text-gray-800 font-medium">Case #{id}</span>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Case Details</h1>
            <p className="text-sm text-gray-500 mt-1">Case ID: {id}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to={`/cases/${id}/summary`} className="btn-primary">View AI Summary</Link>
            <Link to={`/cases/${id}/similar`} className="btn-secondary">Similar Judgments</Link>
          </div>
        </div>

        {/* Placeholder content */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {['Case Number', 'Court', 'Judgment Date', 'Case Type', 'Status', 'Uploaded By'].map(field => (
            <div key={field} className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{field}</p>
              <p className="font-medium text-gray-800">— (loading)</p>
            </div>
          ))}
        </div>
      </div>

      {/* Extracted text preview */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-3">Extracted Text Preview</h2>
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500 font-mono min-h-32">
          Text extraction will appear here after the PDF is processed.
        </div>
      </div>
    </div>
  )
}
