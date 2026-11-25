import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { verifyToken } from '../../../lib/auth.js'
import { prisma } from '../../../lib/prisma.js'

// Vercel: allow this route to run for up to 5 minutes (long judgments)
export const maxDuration = 300

// ─── Settings ────────────────────────────────────────────────────────────────
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'
const SAFE_TPM = Number(process.env.GROQ_SAFE_TPM) || 6500 // tokens we allow per minute

const FALLBACK = 'Not clearly mentioned in the provided judgment text.'
const DISCLAIMER =
  'This summary is an AI-generated study aid designed for legal research and educational reference. It does not constitute formal legal advice.'

const CHUNK_SIZE = 10000 // characters per chunk
const CHUNK_OVERLAP = 300 // characters repeated between chunks
const MAX_NOTES_CHARS = 14000 // if all notes are longer than this, merge them first

// Cases currently being summarized (stops double clicks / duplicate requests)
const casesInProgress = new Set()

// ─── Simple token-per-minute limiter ─────────────────────────────────────────
// We remember how many tokens we used in the last 60 seconds.
// If the next request would go over SAFE_TPM, we wait.
let recentRequests = [] // [{ time, tokens }]

function estimateTokens(text, maxOutput) {
  // about 3.5 characters = 1 token, plus the answer size
  return Math.ceil(text.length / 3.5) + maxOutput
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForTokenBudget(tokens) {
  while (true) {
    const now = Date.now()
    recentRequests = recentRequests.filter((r) => now - r.time < 60000)
    const used = recentRequests.reduce((sum, r) => sum + r.tokens, 0)

    if (used + tokens <= SAFE_TPM) {
      recentRequests.push({ time: now, tokens })
      return
    }

    const waitMs = 60000 - (now - recentRequests[0].time) + 1000
    console.log(`[Groq] Waiting ${Math.ceil(waitMs / 1000)}s (used ${used}/${SAFE_TPM} tokens this minute)`)
    await sleep(waitMs)
  }
}

// ─── One call to Groq ────────────────────────────────────────────────────────
async function askGroq(groq, systemText, userText, maxOutput, wantJson = false) {
  const tokens = estimateTokens(systemText + userText, maxOutput)

  if (tokens > SAFE_TPM) {
    const err = new Error(`Request too large (${tokens} tokens).`)
    err.status = 413
    throw err
  }

  await waitForTokenBudget(tokens)

  const options = {
    model: MODEL,
    temperature: 0.1,
    max_completion_tokens: maxOutput,
    reasoning_effort: 'low',
    messages: [
      { role: 'system', content: systemText },
      { role: 'user', content: userText },
    ],
  }
  if (wantJson) options.response_format = { type: 'json_object' }

  try {
    const completion = await groq.chat.completions.create(options)
    const text = completion.choices?.[0]?.message?.content || ''
    if (!text.trim()) throw new Error('Groq returned an empty response.')
    return text
  } catch (error) {
    // Mark daily quota errors so we can show a clear message
    if (error.status === 429 && /per day|TPD/i.test(error.message || '')) {
      error.code = 'GROQ_DAILY_QUOTA'
    }
    throw error
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function splitIntoChunks(text) {
  const chunks = []
  let start = 0

  while (start < text.length) {
    let end = Math.min(start + CHUNK_SIZE, text.length)

    // Try to end the chunk at a paragraph break so we don't cut a sentence
    if (end < text.length) {
      const breakAt = text.lastIndexOf('\n', end)
      if (breakAt > start + CHUNK_SIZE * 0.7) end = breakAt
    }

    chunks.push(text.slice(start, end).trim())
    if (end >= text.length) break
    start = end - CHUNK_OVERLAP
  }

  return chunks.filter(Boolean)
}

function formatSummary(record) {
  let s = {}
  try {
    s = JSON.parse(record.keyPoints || '{}')
  } catch {}

  return {
    id: record.id,
    caseId: record.caseId,
    caseOverview: s.caseOverview || record.briefFacts || FALLBACK,
    importantFacts: s.importantFacts || record.briefFacts || FALLBACK,
    legalIssues: s.legalIssues || record.issuesRaised || FALLBACK,
    petitionerArguments: s.petitionerArguments || FALLBACK,
    respondentArguments: s.respondentArguments || FALLBACK,
    courtReasoning: s.courtReasoning || record.judgment || FALLBACK,
    finalDecision: s.finalDecision || record.judgment || FALLBACK,
    legalPrinciples: s.legalPrinciples || FALLBACK,
    disclaimer: DISCLAIMER,
    model: record.model || MODEL,
    generatedAt: record.generatedAt,
    updatedAt: record.updatedAt,
  }
}

function errorResponse(error) {
  console.error('[Summarize error]', error)
  const status = error.status || 500

  if (error.code === 'GROQ_DAILY_QUOTA') {
    return { status: 429, code: 'GROQ_DAILY_QUOTA', message: 'Daily Groq token limit reached. Please try again tomorrow.' }
  }
  if (status === 429) {
    return { status: 429, code: 'GROQ_RATE_LIMIT', message: 'Too many requests to Groq. Please wait a minute and try again.' }
  }
  if (status === 401 || status === 403) {
    return { status: 401, code: 'GROQ_AUTH_ERROR', message: 'Groq API key is invalid. Check GROQ_API_KEY in next-backend/.env.' }
  }
  if (status === 413) {
    return { status: 413, code: 'INPUT_TOO_LARGE', message: 'Part of the judgment was too large to process.' }
  }
  return { status: 502, code: 'GROQ_API_ERROR', message: 'Failed to generate summary. Please try again.' }
}

// ─── Prompts ─────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a legal assistant for Indian district courts.
Use ONLY the judgment text given to you. Never invent facts, dates, amounts, sections or case names.
Never present a party's argument as the court's finding.
If the court says an argument "cannot be accepted", "is rejected" or "has no merit", that argument LOST -
never write it as the court's view anywhere in the summary.
Judgments often discuss other cases. Facts and orders of a cited case are NOT facts of this case.
If something is truly not in the text, write exactly: "${FALLBACK}"

VERY IMPORTANT - WHO DID WHAT:
A case usually passes through several courts (Trial Court, First Appellate Court, High Court, Supreme Court).
For every order, write which court passed it and what that court decided.
When the judgment says a court "set aside" or "restored" something, say whose order it was.
Do not mix up what a lower court ordered with what the higher court ordered.`

const NOTES_PROMPT = `Read this part of a court judgment and write short factual notes under these headings:
BENCH AND DATE, PARTIES,
PROCEDURAL HISTORY (one line per court: court name, date, what it decided),
FACTS (names, dates, amounts), QUESTION BEFORE THE COURT, PETITIONER/APPELLANT ARGUMENTS,
RESPONDENT ARGUMENTS, COURT FINDINGS (with paragraph numbers), DEFINITIONS OR GUIDELINES LAID DOWN,
FINAL ORDER (exact words where possible), SECTIONS/ARTICLES/ACTS, CASES CITED.
Write "none" under a heading if this part has nothing for it. Plain text only.`

const MERGE_PROMPT = `Combine these notes from the same judgment into one set of notes with the same headings.
Remove repetition but keep every name, date, amount, section, definition, guideline,
and exactly which court decided what.`

const FINAL_PROMPT = `Write a summary of this ONE judgment. Return a JSON object with these string fields:

caseOverview: case name (Appellant v. Respondent), court, ALL judges on the bench (and who wrote it),
  date, case number, type of proceeding (e.g. civil appeals, writ petition)
  and in 2-3 lines what the case was about.
  Be careful about which party wanted what. If a contract clause makes one party pay the other,
  say clearly who pays and who receives.
importantFacts: the key facts, then the procedural history as a list - each court, its date and what it decided.
legalIssues: a numbered list of the questions the court decided. Most judgments do not frame issues
  formally - then write them yourself from what the court actually discussed
  (for example "whether the High Court was justified in ..."). Never use the fallback for this field.
petitionerArguments: the main arguments of the petitioner/appellant, including cases they relied on.
respondentArguments: the main arguments of the respondent, including cases they relied on. If none are stated, describe that side's
  stand from the text (for example, it supported or did not oppose the petition).
courtReasoning: how this court reasoned. Use paragraph numbers exactly as printed in the judgment
  (e.g. "8." at the start of a paragraph) - never guess a paragraph number. Do not add reasoning
  the court did not give. Every judgment gives reasons, so never use the fallback for this field.
finalDecision: the final order of the court that delivered THIS judgment. Use the court's own words for
  the result ("allowed", "dismissed", "disposed of", "disposed of with modification") - do not change
  "disposed of" into "allowed". Then say
  which court's order was set aside, modified or left undisturbed, and which order was restored.
  Include every direction given (deposits, transfer of money, conditions) and any guidelines laid down.
legalPrinciples: a numbered list of the principles this judgment applied or laid down, with paragraph
  numbers. Every judgment applies at least one principle, so never use the fallback for this field.
  Use the court's own narrow terms and keep any conditions (words like "may", "where", "if",
  "at the election of") - do not turn them into a general rule.

Also add "citations": an array of cases cited in the judgment (max 10).

Before answering, check:
1. Does each order belong to the right court?
2. Is each party's position (who claimed what, who pays whom) stated correctly?
3. Are legalIssues and legalPrinciples filled in from the judgment?
4. When the judgment quotes a statute, do not explain the statute yourself - only report what the court said about it.
5. Does finalDecision agree with what the court held in its reasoning? Never state the opposite of the court's finding.`

// ─── GET /api/summarize?caseId=... (load saved summary) ──────────────────────
export async function GET(request) {
  try {
    const user = await verifyToken(request)
    if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })

    const caseId = new URL(request.url).searchParams.get('caseId')
    if (!caseId) return NextResponse.json({ message: 'caseId is required.' }, { status: 400 })

    const caseRecord = await prisma.case.findFirst({
      where: { id: caseId, userId: user.id },
      include: { summary: true, citations: true, documents: true },
    })
    if (!caseRecord) {
      return NextResponse.json({ message: 'Case not found or you do not have permission to access it.' }, { status: 404 })
    }

    const hasExtractedText = Boolean(
      caseRecord.extractedText?.trim() || caseRecord.documents.some((d) => d.extractedText?.trim()),
    )

    return NextResponse.json({
      summary: caseRecord.summary ? formatSummary(caseRecord.summary) : null,
      citations: caseRecord.citations,
      hasExtractedText,
      inProgress: casesInProgress.has(caseId),
    })
  } catch (error) {
    console.error('[GET /api/summarize]', error)
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 })
  }
}

// ─── POST /api/summarize (generate summary) ─────────────────────────────────
export async function POST(request) {
  let lockedCaseId = null

  try {
    // 1. Check login
    const user = await verifyToken(request)
    if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const { caseId, forceRegenerate } = body
    if (!caseId) return NextResponse.json({ message: 'caseId is required.' }, { status: 400 })

    // 2. Check the case belongs to this user (BEFORE locking)
    const caseRecord = await prisma.case.findFirst({
      where: { id: caseId, userId: user.id },
      include: { summary: true, documents: true, citations: true },
    })
    if (!caseRecord) {
      return NextResponse.json({ message: 'Case not found or you do not have permission to access it.' }, { status: 404 })
    }

    // 3. Return the saved summary unless the user asked to regenerate
    if (caseRecord.summary && forceRegenerate !== true) {
      return NextResponse.json({
        message: 'Summary already exists for this case.',
        summary: formatSummary(caseRecord.summary),
        citations: caseRecord.citations,
        isExisting: true,
      })
    }

    // 4. Stop duplicate requests for the same case
    if (casesInProgress.has(caseId)) {
      return NextResponse.json(
        { message: 'Summary is already being generated for this case. Please wait.', code: 'SUMMARY_ALREADY_PROCESSING' },
        { status: 409 },
      )
    }
    casesInProgress.add(caseId)
    lockedCaseId = caseId

    // 5. Get the judgment text
    const rawText =
      caseRecord.extractedText?.trim() ||
      caseRecord.documents.find((d) => d.extractedText?.trim())?.extractedText.trim()

    if (!rawText) {
      return NextResponse.json({ message: 'No extracted judgment text found for this case.', code: 'NO_EXTRACTED_TEXT' }, { status: 400 })
    }

    // PDF text has many extra spaces ("High   Court   of"). Removing them saves about 10% tokens.
    const text = rawText.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n')

    const apiKey = process.env.GROQ_API_KEY?.trim()
    if (!apiKey || apiKey.length < 15) {
      return NextResponse.json(
        { message: 'Groq API key is not configured. Please set GROQ_API_KEY in next-backend/.env.', code: 'API_KEY_NOT_CONFIGURED' },
        { status: 503 },
      )
    }

    await prisma.case.update({ where: { id: caseId }, data: { status: 'PROCESSING' } })

    const groq = new Groq({ apiKey, timeout: 120000, maxRetries: 1 })

    const metadata = `Case: ${caseRecord.title} | Number: ${caseRecord.caseNumber} | Court: ${caseRecord.court || 'Not provided'}`

    // 6. Short judgment? Send the full text in one call - more accurate, fewer tokens.
    //    Long judgment? Make short notes from each chunk first.
    let source
    if (estimateTokens(SYSTEM_PROMPT + FINAL_PROMPT + text, 1800) <= SAFE_TPM) {
      console.log(`[Groq] Short judgment (${text.length} characters) - summarizing in one call`)
      source = `JUDGMENT TEXT:\n${text}`
    } else {
    const chunks = splitIntoChunks(text)
    console.log(`[Groq] ${text.length} characters → ${chunks.length} chunks`)

    let notes = []
    for (let i = 0; i < chunks.length; i++) {
      console.log(`[Groq] Reading chunk ${i + 1}/${chunks.length}`)
      const note = await askGroq(groq, SYSTEM_PROMPT, `${NOTES_PROMPT}\n\nJUDGMENT PART ${i + 1} OF ${chunks.length}:\n${chunks[i]}`, 1200)
      notes.push(`--- Notes from part ${i + 1} ---\n${note}`)
    }

    // 7. If the notes are too long, merge them in groups of 4
    while (notes.join('\n\n').length > MAX_NOTES_CHARS && notes.length > 1) {
      console.log(`[Groq] Merging ${notes.length} notes`)
      const merged = []
      for (let i = 0; i < notes.length; i += 4) {
        const group = notes.slice(i, i + 4)
        if (group.length === 1) {
          merged.push(group[0])
          continue
        }
        const result = await askGroq(groq, SYSTEM_PROMPT, `${MERGE_PROMPT}\n\n${group.join('\n\n')}`, 900)
        merged.push(result)
      }
      notes = merged
    }

      source = `NOTES:\n${notes.join('\n\n')}`

      // The last page of a judgment has the final order and the judges' names.
      // Notes can miss these, so we also send the real last part of the judgment.
      for (const size of [3000, 1500]) {
        const ending = `\n\nEXACT LAST PART OF THE JUDGMENT (final order and judges' names):\n${text.slice(-size)}`
        if (estimateTokens(SYSTEM_PROMPT + FINAL_PROMPT + metadata + source + ending, 1800) <= SAFE_TPM) {
          source += ending
          break
        }
      }
    }

    // 8. Write the final 8-section summary
    console.log('[Groq] Writing final summary')
    const finalText = await askGroq(groq, SYSTEM_PROMPT, `${FINAL_PROMPT}\n\n${metadata}\n\n${source}`, 1800, true)

    let data
    try {
      data = JSON.parse(finalText)
    } catch {
      return NextResponse.json({ message: 'AI returned an invalid summary. Please try again.', code: 'INVALID_AI_RESPONSE' }, { status: 502 })
    }

    const fields = ['caseOverview', 'importantFacts', 'legalIssues', 'petitionerArguments',
      'respondentArguments', 'courtReasoning', 'finalDecision', 'legalPrinciples']
    const sections = {}
    for (const f of fields) {
      let value = data[f]
      // The AI sometimes returns a list (array) instead of text - join it into numbered lines
      if (Array.isArray(value)) {
        // remove the AI's own numbering ("1. ") so we don't get "1. 1."
        value = value.map((item, i) => `${i + 1}. ${String(typeof item === 'string' ? item : JSON.stringify(item)).replace(/^\s*\d+[.)]\s*/, '')}`).join('\n')
      }
      sections[f] = typeof value === 'string' && value.trim() ? value.trim() : FALLBACK
    }
    sections.disclaimer = DISCLAIMER

    // 9. Save the summary
    const summaryData = {
      briefFacts: sections.importantFacts,
      issuesRaised: sections.legalIssues,
      arguments: `[Petitioner]\n${sections.petitionerArguments}\n\n[Respondent]\n${sections.respondentArguments}`,
      judgment: `[Court Reasoning]\n${sections.courtReasoning}\n\n[Final Decision]\n${sections.finalDecision}`,
      keyPoints: JSON.stringify(sections),
      model: MODEL,
    }

    const saved = await prisma.summary.upsert({
      where: { caseId },
      create: { caseId, ...summaryData },
      update: { ...summaryData, generatedAt: new Date() },
    })

    await prisma.case.update({ where: { id: caseId }, data: { status: 'COMPLETED' } })

    // 10. Save AI citations only if they really appear in the judgment text
    //     and are not already saved (no duplicates)
    const aiCitations = Array.isArray(data.citations) ? data.citations : []
    const existing = new Set(caseRecord.citations.map((c) => c.citation.toLowerCase()))
    // compare with all spaces and line breaks squeezed, so "State of\nJharkhand" still matches
    const squeeze = (str) => str.toLowerCase().replace(/\s+/g, ' ')
    const lowerText = squeeze(text)

    const newCitations = aiCitations
      .filter((c) => typeof c === 'string' && c.trim().length > 3)
      .map((c) => c.trim())
      .filter((c) => lowerText.includes(squeeze(c)) && !existing.has(c.toLowerCase()))
      .slice(0, 10)

    if (newCitations.length > 0) {
      await prisma.citation.createMany({
        data: newCitations.map((c) => ({ caseId, citation: c, type: 'ai_detected', context: null })),
      })
    }

    const citations = await prisma.citation.findMany({ where: { caseId }, orderBy: { createdAt: 'asc' } })

    return NextResponse.json(
      { message: 'Summary generated successfully.', summary: formatSummary(saved), citations },
      { status: 201 },
    )
  } catch (error) {
    if (lockedCaseId) {
      await prisma.case.update({ where: { id: lockedCaseId }, data: { status: 'FAILED' } }).catch(() => {})
    }
    const e = errorResponse(error)
    return NextResponse.json({ message: e.message, code: e.code }, { status: e.status })
  } finally {
    if (lockedCaseId) casesInProgress.delete(lockedCaseId)
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
