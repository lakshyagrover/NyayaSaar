import { NextResponse } from 'next/server'
import { verifyToken } from '../../../../lib/auth.js'
import { prisma } from '../../../../lib/prisma.js'

// ─── Citation Extraction Patterns ────────────────────────────────────────────
//
// These patterns cover common Indian legal citation formats found in
// district court and High Court judgments.
//
// Pattern explanations are inline so they can be explained in a viva.

const CITATION_PATTERNS = [
  // ── Case Law Citations ───────────────────────────────────────────────────

  // AIR citations: e.g. "AIR 1983 SC 1086", "AIR 2010 Delhi 45"
  {
    regex: /\bAIR\s+\d{4}\s+(?:SC|HC|Delhi|Bombay|Madras|Calcutta|Allahabad|Kerala|Punjab|Rajasthan|MP|CG|Orissa|Patna|Gauhati|Himachal|J&K|Jharkhand|Uttarakhand|Gujarat|Andhra|Karnataka|Telangana)\s+\d+\b/gi,
    type: 'case_law',
  },

  // SCC citations: e.g. "(2019) 7 SCC 1", "(2015) 10 SCC 523"
  {
    regex: /\(\d{4}\)\s+\d+\s+SCC\s+\d+/gi,
    type: 'case_law',
  },

  // SCR citations: e.g. "1996 (3) SCR 456"
  {
    regex: /\d{4}\s+\(\d+\)\s+SCR\s+\d+/gi,
    type: 'case_law',
  },

  // ILR citations: e.g. "ILR (2020) 1 Delhi 500"
  {
    regex: /\bILR\s+\(\d{4}\)\s+\d+\s+\w+\s+\d+/gi,
    type: 'case_law',
  },

  // Cr.L.J citations: e.g. "2018 Cr.L.J 1234"
  {
    regex: /\b\d{4}\s+Cr\.L\.J\s+\d+/gi,
    type: 'case_law',
  },

  // MANU citations: e.g. "MANU/SC/0123/2019"
  {
    regex: /\bMANU\/[A-Z]{2}\/\d+\/\d{4}\b/gi,
    type: 'case_law',
  },

  // ── Statutes and Acts ────────────────────────────────────────────────────

  // Named Acts with year — only match if it ends with Act/Code/Rules/Ordinance
  // and has a 4-digit year. This avoids false positives from plain sentences.
  {
    regex: /\b(?:the\s+)?[A-Z][A-Za-z ]{2,55}(?:Act|Code|Ordinance|Regulation|Rules|Sanhita),?\s+\d{4}\b/g,
    type: 'statute',
  },

  // ── Sections and Subsections ─────────────────────────────────────────────

  // Section references: "Section 302", "Section 138 of the NI Act", "Sections 420 and 406 IPC"
  {
    regex: /\bS(?:ections?|ec\.?)\s+\d+[A-Z]?(?:\([0-9a-z]+\))*(?:\s*(?:,|and|&|\/)\s*\d+[A-Z]?(?:\([0-9a-z]+\))*)*(?:\s+of\s+(?:the\s+)?[A-Z][A-Za-z ]{1,40}?(?:Act|Code|CPC|CrPC|IPC)\b)?/g,
    type: 'section',
  },

  // Order/Rule references: "Order 39 Rule 1 & 2", "Order VII Rule 11"
  {
    regex: /\bOrder\s+[IVXLC\d]+\s+Rule[s]?\s+\d+(?:\s*(?:and|&|,)\s*\d+)*/gi,
    type: 'section',
  },

  // Article of Constitution: "Article 21", "Article 14 of the Constitution"
  {
    regex: /\bArticle\s+\d+[A-Z]?(?:\s*(?:and|&|,)\s*\d+[A-Z]?)*(?:\s+of\s+the\s+Constitution(?:\s+of\s+India)?)?/gi,
    type: 'section',
  },

  // Schedule references: "Schedule VII", "First Schedule"
  {
    regex: /\b(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth|[IVXLC]+)\s+Schedule\b/gi,
    type: 'section',
  },
]

/**
 * Extract citations from text using regex patterns.
 *
 * Returns an array of objects: { citation, type, context }
 * - citation: the matched string
 * - type: 'case_law' | 'statute' | 'section'
 * - context: up to 120 characters of surrounding text for context
 *
 * Deduplication: same citation text string appears only once.
 */
function extractCitationsFromText(text) {
  const seen = new Set()
  const results = []

  for (const { regex, type } of CITATION_PATTERNS) {
    // Reset regex lastIndex each time (important for /g flag)
    regex.lastIndex = 0

    let match
    while ((match = regex.exec(text)) !== null) {
      // remove extra spaces and a leading "the " ("the Prevention of Corruption Act, 1988")
      const citation = match[0].replace(/\s+/g, ' ').trim().replace(/^the\s+/i, '')

      // Skip very short or generic matches that aren't real citations
      if (citation.length < 6) continue

      // Deduplicate by exact citation text
      const key = citation.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)

      // Extract surrounding context (60 chars before + 60 chars after the match)
      const start = Math.max(0, match.index - 60)
      const end = Math.min(text.length, match.index + citation.length + 60)
      let context = text.slice(start, end).replace(/\s+/g, ' ').trim()

      // Start and end the snippet on whole words (no "…" dots)
      if (start > 0) context = context.replace(/^\S*\s/, '')
      if (end < text.length) context = context.replace(/\s\S*$/, '')

      // Remove page footers like "Criminal Appeal No. 4277 of 2024Page 4 of 13"
      context = context
        .replace(/[A-Za-z. ]*No\.\s*\d+\s*of\s*\d{4}\s*Page\s*\d+\s*of\s*\d+/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()

      results.push({ citation, type, context: context.slice(0, 300) })
    }
  }

  // Sort: case_law first, then statute, then section — then alphabetically within each group
  results.sort((a, b) => {
    const order = { case_law: 0, statute: 1, section: 2 }
    const diff = (order[a.type] ?? 3) - (order[b.type] ?? 3)
    if (diff !== 0) return diff
    return a.citation.localeCompare(b.citation)
  })

  return results
}

// ─── GET /api/citations/[caseId] ─────────────────────────────────────────────
/**
 * Returns stored citations for a case owned by the authenticated user.
 * Query param: ?extract=true  → re-run extraction and save results before returning.
 */
export async function GET(request, { params }) {
  try {
    const user = await verifyToken(request)
    if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })

    const { caseId } = params

    // Verify ownership
    const caseRecord = await prisma.case.findFirst({
      where: { id: caseId, userId: user.id },
    })
    if (!caseRecord) {
      return NextResponse.json(
        { message: 'Case not found or you do not have permission to access it.' },
        { status: 404 },
      )
    }

    // Optional: re-extract on demand via ?extract=true
    const { searchParams } = new URL(request.url)
    const shouldExtract = searchParams.get('extract') === 'true'

    if (shouldExtract) {
      return await runExtraction(caseRecord)
    }

    // Otherwise return what's stored
    const citations = await prisma.citation.findMany({
      where: { caseId },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      caseId,
      citations,
      count: citations.length,
      message:
        citations.length === 0
          ? 'No citations stored yet. Use ?extract=true to run extraction.'
          : `${citations.length} citation(s) found.`,
    })
  } catch (error) {
    console.error('[GET /api/citations/[caseId]]', error)
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 })
  }
}

// ─── POST /api/citations/[caseId] ────────────────────────────────────────────
/**
 * Runs citation extraction on the case's extracted text and saves results.
 * Idempotent: existing citations are deleted and replaced so running multiple
 * times does not create duplicates.
 *
 * This keeps it simple and explainable for a viva:
 * "We delete old ones and re-insert fresh ones from the current text."
 */
export async function POST(request, { params }) {
  try {
    const user = await verifyToken(request)
    if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })

    const { caseId } = params

    const caseRecord = await prisma.case.findFirst({
      where: { id: caseId, userId: user.id },
    })
    if (!caseRecord) {
      return NextResponse.json(
        { message: 'Case not found or you do not have permission to access it.' },
        { status: 404 },
      )
    }

    return await runExtraction(caseRecord)
  } catch (error) {
    console.error('[POST /api/citations/[caseId]]', error)
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 })
  }
}

// ─── Shared extraction logic ──────────────────────────────────────────────────
async function runExtraction(caseRecord) {
  const text = caseRecord.extractedText?.trim()

  if (!text) {
    return NextResponse.json(
      {
        caseId: caseRecord.id,
        citations: [],
        count: 0,
        message:
          'No extracted text available for this case. Upload a digital PDF first to enable citation extraction.',
        code: 'NO_EXTRACTED_TEXT',
      },
      { status: 400 },
    )
  }

  // PDF text has line breaks and special spaces inside names ("Prevention   of\nCorruption").
  // Turn them all into single normal spaces so the patterns can match.
  const cleanText = text.replace(/\u00ad/g, '').replace(/\s+/g, ' ')

  // Run regex-based extraction
  const extracted = extractCitationsFromText(cleanText)

  // Idempotent: delete old regex citations and re-insert fresh results.
  // Citations found by the AI summary (type 'ai_detected') are kept.
  await prisma.$transaction(async (tx) => {
    // Delete old citations. Keep only case NAMES found by the AI (e.g. "X v. Y"),
    // because the patterns below can only find report numbers like "(2018) 15 SCC 139".
    await tx.citation.deleteMany({
      where: { caseId: caseRecord.id, NOT: { type: 'case_name' } },
    })

    if (extracted.length > 0) {
      await tx.citation.createMany({
        data: extracted.slice(0, 50).map((c) => ({
          caseId: caseRecord.id,
          citation: c.citation,
          type: c.type,
          context: c.context,
        })),
      })
    }
  })

  const saved = await prisma.citation.findMany({
    where: { caseId: caseRecord.id },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(
    {
      caseId: caseRecord.id,
      citations: saved,
      count: saved.length,
      message:
        saved.length === 0
          ? 'No legal citations were detected in this judgment text.'
          : `${saved.length} citation(s) extracted and saved successfully.`,
    },
    { status: 201 },
  )
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
