import { NextResponse } from 'next/server'
import { verifyToken } from '../../../../lib/auth.js'
import { prisma } from '../../../../lib/prisma.js'

const CITATION_PATTERNS = [
  {
    regex: /\bAIR\s+\d{4}\s+(?:SC|HC|Delhi|Bombay|Madras|Calcutta|Allahabad|Kerala|Punjab|Rajasthan|MP|CG|Orissa|Patna|Gauhati|Himachal|J&K|Jharkhand|Uttarakhand|Gujarat|Andhra|Karnataka|Telangana)\s+\d+\b/gi,
    type: 'case_law',
  },

  {
    regex: /\(\d{4}\)\s+\d+\s+SCC\s+\d+/gi,
    type: 'case_law',
  },

  {
    regex: /\d{4}\s+\(\d+\)\s+SCR\s+\d+/gi,
    type: 'case_law',
  },

  {
    regex: /\bILR\s+\(\d{4}\)\s+\d+\s+\w+\s+\d+/gi,
    type: 'case_law',
  },

  {
    regex: /\b\d{4}\s+Cr\.L\.J\s+\d+/gi,
    type: 'case_law',
  },

  {
    regex: /\bMANU\/[A-Z]{2}\/\d+\/\d{4}\b/gi,
    type: 'case_law',
  },

  {
    regex: /\b(?:the\s+)?[A-Z][A-Za-z ]{2,55}(?:Act|Code|Ordinance|Regulation|Rules|Sanhita),?\s+\d{4}\b/g,
    type: 'statute',
  },

  {
    regex: /\bS(?:ections?|ec\.?)\s+\d+[A-Z]?(?:\([0-9a-z]+\))*(?:\s*(?:,|and|&|\/)\s*\d+[A-Z]?(?:\([0-9a-z]+\))*)*(?:\s+of\s+(?:the\s+)?[A-Z][A-Za-z ]{1,40}?(?:Act|Code|CPC|CrPC|IPC)\b)?/g,
    type: 'section',
  },

  {
    regex: /\bOrder\s+[IVXLC\d]+\s+Rule[s]?\s+\d+(?:\s*(?:and|&|,)\s*\d+)*/gi,
    type: 'section',
  },

  {
    regex: /\bArticle\s+\d+[A-Z]?(?:\s*(?:and|&|,)\s*\d+[A-Z]?)*(?:\s+of\s+the\s+Constitution(?:\s+of\s+India)?)?/gi,
    type: 'section',
  },

  {
    regex: /\b(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth|[IVXLC]+)\s+Schedule\b/gi,
    type: 'section',
  },
]

function getSentence(text, start, end) {
  const before = text.slice(Math.max(0, start - 300), start)
  const after = text.slice(end, end + 300)

  const lastStop = Math.max(before.lastIndexOf('. '), before.lastIndexOf('; '))
  let sentenceStart = lastStop >= 0 ? before.slice(lastStop + 2) : before.replace(/^\S*\s/, '')

  const nextStop = after.search(/[.;](\s|$)/)
  let sentenceEnd = nextStop >= 0 ? after.slice(0, nextStop + 1) : after.replace(/\s\S*$/, '') + ' ...'

  return (sentenceStart + text.slice(start, end) + sentenceEnd).trim()
}

function extractCitationsFromText(text) {
  const seen = new Set()
  const results = []

  for (const { regex, type } of CITATION_PATTERNS) {
    regex.lastIndex = 0

    let match
    while ((match = regex.exec(text)) !== null) {
      const citation = match[0].replace(/\s+/g, ' ').trim().replace(/^the\s+/i, '')

      if (citation.length < 6) continue

      const key = citation.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)

      const context = getSentence(text, match.index, match.index + match[0].length)

      results.push({ citation, type, context })
    }
  }

  results.sort((a, b) => {
    const order = { case_law: 0, statute: 1, section: 2 }
    const diff = (order[a.type] ?? 3) - (order[b.type] ?? 3)
    if (diff !== 0) return diff
    return a.citation.localeCompare(b.citation)
  })

  return results
}

export async function GET(request, { params }) {
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

    const { searchParams } = new URL(request.url)
    const shouldExtract = searchParams.get('extract') === 'true'

    if (shouldExtract) {
      return await runExtraction(caseRecord)
    }

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

  const cleanText = text
    .replace(/\u00ad/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[A-Z][A-Za-z.()]*(?: [A-Za-z.()]+){0,4} No\. ?\d+[\d\-–]* of \d{4} ?Page \d+ of \d+/g, ' ')
    .replace(/\s+/g, ' ')

  const extracted = extractCitationsFromText(cleanText)

  await prisma.$transaction(async (tx) => {
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
