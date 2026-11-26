export default function Home() {
  return (
    <main style={{ fontFamily: 'monospace', padding: '2rem', maxWidth: 600 }}>
      <h1>NyayaSaar API</h1>
      <p>This is the Next.js REST API backend.</p>
      <p>All client traffic should come from the React frontend at <code>http://localhost:5173</code>.</p>
      <hr />
      <h2>Available API Routes</h2>
      <ul>
        <li>POST /api/auth/register</li>
        <li>POST /api/auth/login</li>
        <li>GET  /api/auth/me</li>
        <li>POST /api/auth/logout</li>
        <li>GET  /api/users/profile</li>
        <li>PUT  /api/users/profile</li>
        <li>GET  /api/cases</li>
        <li>POST /api/cases</li>
        <li>GET  /api/cases/[id]</li>
        <li>PUT  /api/cases/[id]</li>
        <li>DELETE /api/cases/[id]</li>
        <li>POST /api/upload</li>
        <li>POST /api/summarize</li>
        <li>GET  /api/citations/[caseId]</li>
        <li>GET  /api/similar/[caseId]</li>
        <li>GET  /api/hearings</li>
        <li>POST /api/hearings</li>
        <li>PUT  /api/hearings/[id]</li>
        <li>DELETE /api/hearings/[id]</li>
      </ul>
    </main>
  )
}
