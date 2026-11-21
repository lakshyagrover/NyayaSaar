import { useParams, Link } from 'react-router-dom'

export default function SimilarJudgments() {
  const { id } = useParams()
  // TODO: Fetch from GET /api/similar/:id

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/cases" className="hover:text-primary-700">All Cases</Link>
        <span>/</span>
        <Link to={`/cases/${id}`} className="hover:text-primary-700">Case #{id}</Link>
        <span>/</span>
        <span className="text-gray-800 font-medium">Similar Judgments</span>
      </div>

      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900">Similar Judgments</h1>
        <p className="text-sm text-gray-500 mt-1">
          AI-powered semantic search across the judgment corpus.
        </p>
      </div>

      <div className="card text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">🔍</p>
        <p className="font-medium text-gray-600">Similarity search not yet connected</p>
        <p className="text-sm mt-1">
          Once the Gemini embeddings API is configured, similar judgments will appear here.
        </p>
      </div>
    </div>
  )
}
