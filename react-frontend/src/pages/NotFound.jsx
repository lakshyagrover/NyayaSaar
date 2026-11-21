import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-6xl font-bold text-primary-700">404</p>
        <h1 className="mt-4 text-2xl font-semibold text-gray-800">Page not found</h1>
        <p className="mt-2 text-gray-500">The page you are looking for doesn&apos;t exist.</p>
        <Link to="/dashboard" className="btn-primary mt-6 inline-flex">Go to Dashboard</Link>
      </div>
    </div>
  )
}
