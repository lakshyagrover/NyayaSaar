export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-court-cream">
      <div className="bg-court-navy text-white p-8 lg:p-12 flex flex-col justify-between gap-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-court-gold/15 border border-court-gold/40 flex items-center justify-center text-court-gold font-serif font-bold text-xl">
            N
          </div>
          <span className="font-serif text-2xl font-bold text-court-gold">NyayaSaar</span>
        </div>

        <div>
          <h1 className="text-3xl lg:text-4xl font-semibold leading-tight max-w-md">
            Lengthy judgments, <span className="text-court-gold">made clear.</span>
          </h1>
          <p className="text-sm text-white/60 mt-4 max-w-sm leading-relaxed">
            Upload a judgment PDF and get a structured summary, citations, similar cases and
            your hearing dates in one place.
          </p>
        </div>

        <p className="text-xs text-white/40">AI Court Judgment Summarizer for District Courts</p>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
