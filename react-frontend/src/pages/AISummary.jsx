import { useParams, Link } from 'react-router-dom'

const SECTION_HEADINGS = ['Brief Facts', 'Issues Raised', 'Arguments', 'Judgment & Order', 'Key Legal Points']

export default function AISummary() {
  const { id } = useParams()
  // TODO: Fetch summary from GET /api/summarize?caseId=:id or POST /api/summarize

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/cases" className="hover:text-primary-700">All Cases</Link>
        <span>/</span>
        <Link to={`/cases/${id}`} className="hover:text-primary-700">Case #{id}</Link>
        <span>/</span>
        <span className="text-gray-800 font-medium">AI Summary</span>
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI-Generated Summary</h1>
            <p className="text-sm text-gray-500 mt-1">Powered by Google Gemini</p>
          </div>
          <span className="badge badge-green">Gemini AI</span>
        </div>
      </div>

      {/* Summary sections */}
      <div className="space-y-4">
        {SECTION_HEADINGS.map(heading => (
          <div key={heading} className="card">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span>⚖️</span> {heading}
            </h2>
            <div className="text-sm text-gray-400 italic">
              AI summary will appear here once generated. Connect the Gemini API to enable this feature.
            </div>
          </div>
        ))}
      </div>

      {/* Legal citations */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-3">📚 Legal Citations Extracted</h2>
        <p className="text-sm text-gray-400 italic">Citations will be listed here after extraction.</p>
      </div>
    </div>
  )
}
