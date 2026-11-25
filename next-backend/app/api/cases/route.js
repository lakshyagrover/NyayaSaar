import { NextResponse } from 'next/server'
import { verifyToken } from '../../../lib/auth.js'
import { prisma } from '../../../lib/prisma.js'

/**
 * GET /api/cases
 * Query params:
 *   - page: number (default 1)
 *   - limit: number (default 20, max 100)
 *   - search: string (optional search in title or caseNumber)
 *   - status: string (optional filter)
 *
 * Returns only cases belonging to the authenticated user.
 */
export async function GET(request) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const search = searchParams.get('search')?.trim()
    const status = searchParams.get('status')?.trim()

    // Scoped strictly to the authenticated user
    const where = {
      userId: user.id,
    }

    if (status) {
      where.status = status.toUpperCase()
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { caseNumber: { contains: search } },
        { court: { contains: search } },
      ]
    }

    const [cases, total] = await Promise.all([
      prisma.case.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              documents: true,
              citations: true,
              hearings: true,
            },
          },
          summary: {
            select: {
              id: true,
              generatedAt: true,
              model: true,
            },
          },
        },
      }),
      prisma.case.count({ where }),
    ])

    return NextResponse.json({
      cases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    })
  } catch (error) {
    console.error('[GET /api/cases]', error)
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 })
  }
}

/**
 * POST /api/cases
 * Body: { title, caseNumber, court?, judgmentDate?, caseType?, status?, extractedText? }
 *
 * Creates a new case belonging to the authenticated user.
 */
export async function POST(request) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
    }

    const body = await request.json()
    const { title, caseNumber, court, judgmentDate, caseType, status, extractedText } = body

    // ── Validation ────────────────────────────────────────────────────────
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ message: 'Case title is required.' }, { status: 400 })
    }

    if (!caseNumber || typeof caseNumber !== 'string' || !caseNumber.trim()) {
      return NextResponse.json({ message: 'Case number is required.' }, { status: 400 })
    }

    const normalizedCaseNumber = caseNumber.trim()

    // ── Check duplicate case number ───────────────────────────────────────
    const existing = await prisma.case.findUnique({
      where: { caseNumber: normalizedCaseNumber },
    })
    if (existing) {
      return NextResponse.json(
        { message: `A case with case number "${normalizedCaseNumber}" already exists.` },
        { status: 409 },
      )
    }

    // ── Parse optional date ───────────────────────────────────────────────
    let parsedDate = null
    if (judgmentDate) {
      const d = new Date(judgmentDate)
      if (isNaN(d.getTime())) {
        return NextResponse.json({ message: 'Invalid judgment date format.' }, { status: 400 })
      }
      parsedDate = d
    }

    // ── Create case ───────────────────────────────────────────────────────
    const newCase = await prisma.case.create({
      data: {
        title: title.trim(),
        caseNumber: normalizedCaseNumber,
        court: court?.trim() || null,
        judgmentDate: parsedDate,
        caseType: caseType?.trim() || null,
        status: status ? status.toUpperCase() : 'PENDING',
        extractedText: extractedText?.trim() || null,
        userId: user.id,
      },
      include: {
        _count: {
          select: {
            documents: true,
            citations: true,
            hearings: true,
          },
        },
      },
    })

    return NextResponse.json(
      { message: 'Case created successfully.', case: newCase },
      { status: 201 },
    )
  } catch (error) {
    console.error('[POST /api/cases]', error)
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
