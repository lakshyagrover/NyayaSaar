import { NextResponse } from 'next/server'
import { verifyToken } from '../../../../lib/auth.js'
import { prisma } from '../../../../lib/prisma.js'

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'shall', 'that', 'this',
  'it', 'its', 'he', 'she', 'they', 'their', 'there', 'which', 'who',
  'whom', 'when', 'where', 'what', 'how', 'why', 'not', 'no', 'nor',
  'so', 'yet', 'both', 'either', 'each', 'any', 'all', 'such', 'other',
  'than', 'then', 'thus', 'also', 'only', 'very', 'just', 'more', 'most',
  'into', 'upon', 'under', 'over', 'above', 'below', 'between', 'among',
  'said', 'aforesaid', 'herein', 'thereof', 'whereof', 'hereby',
  'petitioner', 'respondent', 'applicant', 'appellant', 'defendant',
  'plaintiff', 'versus', 'vs', 'writ', 'petition', 'order', 'dated',
  'honourable', 'hon', 'ble', 'learned', 'counsel', 'court', 'judge',
  'bench', 'para', 'page',
  'case', 'cases', 'high', 'supreme', 'against', 'public', 'present', 'made', 'passed',
  'per', 'also', 'one', 'two', 'can', 'out', 'any', 'judgment', 'appeal', 'appeals',
])

function tokenise(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w))
}

function termFrequency(tokens) {
  const tf = {}
  for (const token of tokens) {
    tf[token] = (tf[token] || 0) + 1
  }
  return tf
}

function buildTfIdfVectors(documents) {
  const N = documents.length
  if (N === 0) return new Map()

  const df = {}
  for (const doc of documents) {
    const unique = new Set(doc.tokens)
    for (const term of unique) {
      df[term] = (df[term] || 0) + 1
    }
  }

  const vectors = new Map()
  for (const doc of documents) {
    const tf = termFrequency(doc.tokens)
    const vector = {}
    for (const [term, count] of Object.entries(tf)) {
      const tfScore = count / doc.tokens.length
      const idfScore = Math.log((N + 1) / ((df[term] || 1) + 1)) + 1
      vector[term] = tfScore * idfScore
    }
    vectors.set(doc.id, vector)
  }

  return vectors
}

function cosineSimilarity(vecA, vecB) {
  let dot = 0
  let magA = 0
  let magB = 0

  for (const [term, scoreA] of Object.entries(vecA)) {
    dot += scoreA * (vecB[term] || 0)
    magA += scoreA * scoreA
  }
  for (const scoreB of Object.values(vecB)) {
    magB += scoreB * scoreB
  }

  if (magA === 0 || magB === 0) return 0
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

function topSharedTerms(vecA, vecB, limit = 5) {
  const shared = []
  for (const [term, scoreA] of Object.entries(vecA)) {
    if (vecB[term]) {
      shared.push({ term, score: scoreA * vecB[term] })
    }
  }
  shared.sort((a, b) => b.score - a.score)
  return shared.slice(0, limit).map((s) => s.term)
}

export async function GET(request, { params }) {
  try {
    const user = await verifyToken(request)
    if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })

    const { caseId } = params

    const targetCase = await prisma.case.findFirst({
      where: { id: caseId, userId: user.id },
      select: {
        id: true,
        title: true,
        caseNumber: true,
        court: true,
        judgmentDate: true,
        caseType: true,
        extractedText: true,
      },
    })

    if (!targetCase) {
      return NextResponse.json(
        { message: 'Case not found or you do not have permission to access it.' },
        { status: 404 },
      )
    }

    if (!targetCase.extractedText?.trim()) {
      return NextResponse.json({
        caseId,
        similar: [],
        count: 0,
        message:
          'This case has no extracted text. Upload a digital PDF to enable similarity search.',
        code: 'NO_EXTRACTED_TEXT',
      })
    }

    const otherCases = await prisma.case.findMany({
      where: {
        userId: user.id,
        id: { not: caseId },
        extractedText: { not: null },
      },
      select: {
        id: true,
        title: true,
        caseNumber: true,
        court: true,
        judgmentDate: true,
        caseType: true,
        extractedText: true,
      },
    })

    if (otherCases.length === 0) {
      return NextResponse.json({
        caseId,
        similar: [],
        count: 0,
        message:
          'No other cases with extracted text found. Upload more judgments to enable similarity comparison.',
      })
    }

    const MAX_TEXT = 50000

    const allDocs = [
      { id: targetCase.id, tokens: tokenise(targetCase.extractedText.slice(0, MAX_TEXT)) },
      ...otherCases.map((c) => ({
        id: c.id,
        tokens: tokenise((c.extractedText || '').slice(0, MAX_TEXT)),
      })),
    ].filter((d) => d.tokens.length >= 10)

    if (allDocs.length < 2) {
      return NextResponse.json({
        caseId,
        similar: [],
        count: 0,
        message: 'Not enough text content to perform similarity comparison.',
      })
    }

    const vectors = buildTfIdfVectors(allDocs)
    const targetVec = vectors.get(targetCase.id)

    if (!targetVec) {
      return NextResponse.json({
        caseId,
        similar: [],
        count: 0,
        message: 'Could not build vector for target case.',
      })
    }

    const scored = otherCases
      .map((c) => {
        const vec = vectors.get(c.id)
        if (!vec) return null

        const score = cosineSimilarity(targetVec, vec)
        const matchingTerms = topSharedTerms(targetVec, vec, 5)

        return {
          id: c.id,
          title: c.title,
          caseNumber: c.caseNumber,
          court: c.court,
          judgmentDate: c.judgmentDate,
          caseType: c.caseType,
          similarityScore: Math.round(score * 10000) / 10000,
          similarityPercent: Math.round(score * 100),
          matchingTopics: matchingTerms,
          explanation:
            matchingTerms.length > 0
              ? `Shares legal topics: ${matchingTerms.join(', ')}`
              : 'Low keyword overlap detected.',
        }
      })
      .filter(Boolean)
      .filter((r) => r.similarityScore > 0)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 5)

    return NextResponse.json({
      caseId,
      targetCase: {
        id: targetCase.id,
        title: targetCase.title,
        caseNumber: targetCase.caseNumber,
      },
      similar: scored,
      count: scored.length,
      disclaimer:
        'Similarity scores indicate textual keyword overlap only. They do not imply legal equivalence, binding precedent, or judicial authority.',
      message:
        scored.length === 0
          ? 'No similar cases found among your uploaded judgments.'
          : `Found ${scored.length} similar judgment(s) based on textual analysis.`,
    })
  } catch (error) {
    console.error('[GET /api/similar/[caseId]]', error)
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
