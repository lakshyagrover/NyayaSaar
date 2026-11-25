import { NextResponse } from 'next/server'
import { verifyToken } from '../../../../lib/auth.js'
import { prisma } from '../../../../lib/prisma.js'

// ─── TF-IDF Cosine Similarity ─────────────────────────────────────────────────
//
// This is a simple text-based similarity approach that is easy to explain:
//
// 1. TF (Term Frequency): How often a word appears in this document.
// 2. IDF (Inverse Document Frequency): Words that appear in ALL documents
//    are less informative. We penalise them.
// 3. TF-IDF vector: Each document becomes a vector of numbers, one per word.
// 4. Cosine similarity: We measure the angle between two vectors.
//    Score of 1.0 = identical topics. Score of 0.0 = completely different.
//
// No external AI API or vector database is needed.

// Common English + Indian legal stop-words to skip
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
  // Indian legal boilerplate
  'said', 'aforesaid', 'herein', 'thereof', 'whereof', 'hereby',
  'petitioner', 'respondent', 'applicant', 'appellant', 'defendant',
  'plaintiff', 'versus', 'vs', 'writ', 'petition', 'order', 'dated',
  'honourable', 'hon', 'ble', 'learned', 'counsel', 'court', 'judge',
  'bench', 'para', 'page',
  // very common judgment words that do not tell us the topic
  'case', 'cases', 'high', 'supreme', 'against', 'public', 'present', 'made', 'passed',
  'per', 'also', 'one', 'two', 'can', 'out', 'any', 'judgment', 'appeal', 'appeals',
])

/** Tokenise text into lowercase words, removing stop-words and very short tokens */
function tokenise(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')  // remove punctuation
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w)) // skip numbers like 000, 2024
}

/** Count how many times each token appears (term frequency map) */
function termFrequency(tokens) {
  const tf = {}
  for (const token of tokens) {
    tf[token] = (tf[token] || 0) + 1
  }
  return tf
}

/**
 * Build TF-IDF vectors for a set of documents.
 *
 * documents: Array of { id, tokens[] }
 * Returns: Map<id, { [term]: tfidf_score }>
 */
function buildTfIdfVectors(documents) {
  const N = documents.length
  if (N === 0) return new Map()

  // Document frequency: how many documents contain each term
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
      // TF: normalise by document length
      const tfScore = count / doc.tokens.length
      // IDF: smoothed formula log((N+1)/(df+1))+1 avoids zero scores when
      // a term appears in ALL documents (common in small corpora of 2-3 cases).
      const idfScore = Math.log((N + 1) / ((df[term] || 1) + 1)) + 1
      vector[term] = tfScore * idfScore
    }
    vectors.set(doc.id, vector)
  }

  return vectors
}

/**
 * Cosine similarity between two TF-IDF vectors.
 * Returns a number between 0 (no overlap) and 1 (identical).
 */
function cosineSimilarity(vecA, vecB) {
  let dot = 0
  let magA = 0
  let magB = 0

  // Only iterate terms that appear in vecA (most efficient)
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

/**
 * Find the top-5 keywords that contributed most to the similarity score
 * between two vectors. Used to explain WHY two cases are similar.
 */
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

// ─── GET /api/similar/[caseId] ────────────────────────────────────────────────
/**
 * Returns up to 5 cases from the authenticated user's own case list that are
 * most textually similar to the given case, using TF-IDF cosine similarity.
 *
 * Security: only searches within the authenticated user's own cases.
 * No other user's cases are ever accessed or returned.
 */
export async function GET(request, { params }) {
  try {
    const user = await verifyToken(request)
    if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })

    const { caseId } = params

    // ── 1. Fetch the target case (verify ownership) ────────────────────────
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

    // ── 2. Fetch all other cases by this user that have extracted text ──────
    const otherCases = await prisma.case.findMany({
      where: {
        userId: user.id,
        id: { not: caseId },             // exclude the current case
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

    // ── 3. Tokenise all documents ──────────────────────────────────────────
    // We limit the text to the first 50,000 chars per case to keep
    // processing fast without losing the main topics.
    const MAX_TEXT = 50000

    const allDocs = [
      { id: targetCase.id, tokens: tokenise(targetCase.extractedText.slice(0, MAX_TEXT)) },
      ...otherCases.map((c) => ({
        id: c.id,
        tokens: tokenise((c.extractedText || '').slice(0, MAX_TEXT)),
      })),
    ].filter((d) => d.tokens.length >= 10) // skip near-empty docs

    if (allDocs.length < 2) {
      return NextResponse.json({
        caseId,
        similar: [],
        count: 0,
        message: 'Not enough text content to perform similarity comparison.',
      })
    }

    // ── 4. Build TF-IDF vectors ────────────────────────────────────────────
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

    // ── 5. Score each other case ───────────────────────────────────────────
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
          // Round to 4 decimal places for display
          similarityScore: Math.round(score * 10000) / 10000,
          // Human-readable percentage
          similarityPercent: Math.round(score * 100),
          // Top matching keywords that drove the score
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
      .slice(0, 5) // top 5 results

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
