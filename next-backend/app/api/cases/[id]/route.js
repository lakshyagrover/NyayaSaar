import { NextResponse } from 'next/server'
import { verifyToken } from '../../../../lib/auth.js'
import { prisma } from '../../../../lib/prisma.js'

/**
 * GET /api/cases/[id]
 * Fetches the requested case and verifies ownership.
 * Returns 404 if it does not exist or does not belong to the user.
 */
export async function GET(request, { params }) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
    }

    const { id } = params
    if (!id) {
      return NextResponse.json({ message: 'Case ID is required.' }, { status: 400 })
    }

    // Verify ownership: case must match both ID and authenticated userId
    const caseRecord = await prisma.case.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        summary: true,
        citations: {
          orderBy: { createdAt: 'desc' },
        },
        hearings: {
          orderBy: { date: 'asc' },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            documents: true,
            citations: true,
            hearings: true,
          },
        },
      },
    })

    if (!caseRecord) {
      return NextResponse.json({ message: 'Case not found.' }, { status: 404 })
    }

    return NextResponse.json({ case: caseRecord })
  } catch (error) {
    console.error('[GET /api/cases/[id]]', error)
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 })
  }
}

/**
 * PUT /api/cases/[id]
 * Updates allowed fields for a case owned by the authenticated user.
 */
export async function PUT(request, { params }) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
    }

    const { id } = params
    if (!id) {
      return NextResponse.json({ message: 'Case ID is required.' }, { status: 400 })
    }

    // Check ownership first
    const existing = await prisma.case.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ message: 'Case not found.' }, { status: 404 })
    }

    const body = await request.json()
    const { title, caseNumber, court, judgmentDate, caseType, status, extractedText } = body

    const updateData = {}

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return NextResponse.json({ message: 'Case title cannot be empty.' }, { status: 400 })
      }
      updateData.title = title.trim()
    }

    if (caseNumber !== undefined) {
      if (typeof caseNumber !== 'string' || !caseNumber.trim()) {
        return NextResponse.json({ message: 'Case number cannot be empty.' }, { status: 400 })
      }
      const trimmedCaseNo = caseNumber.trim()
      if (trimmedCaseNo !== existing.caseNumber) {
        const conflict = await prisma.case.findUnique({
          where: { caseNumber: trimmedCaseNo },
        })
        if (conflict) {
          return NextResponse.json(
            { message: `Case number "${trimmedCaseNo}" is already in use.` },
            { status: 409 },
          )
        }
        updateData.caseNumber = trimmedCaseNo
      }
    }

    if (court !== undefined) {
      updateData.court = court ? court.trim() : null
    }

    if (judgmentDate !== undefined) {
      if (judgmentDate === null || judgmentDate === '') {
        updateData.judgmentDate = null
      } else {
        const d = new Date(judgmentDate)
        if (isNaN(d.getTime())) {
          return NextResponse.json({ message: 'Invalid judgment date format.' }, { status: 400 })
        }
        updateData.judgmentDate = d
      }
    }

    if (caseType !== undefined) {
      updateData.caseType = caseType ? caseType.trim() : null
    }

    if (status !== undefined) {
      updateData.status = status ? status.toUpperCase() : 'PENDING'
    }

    if (extractedText !== undefined) {
      updateData.extractedText = extractedText ? extractedText.trim() : null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'No valid fields provided for update.' }, { status: 400 })
    }

    const updated = await prisma.case.update({
      where: { id },
      data: updateData,
      include: {
        summary: true,
        citations: true,
        hearings: true,
        documents: true,
        _count: {
          select: {
            documents: true,
            citations: true,
            hearings: true,
          },
        },
      },
    })

    return NextResponse.json({
      message: 'Case updated successfully.',
      case: updated,
    })
  } catch (error) {
    console.error('[PUT /api/cases/[id]]', error)
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 })
  }
}

/**
 * DELETE /api/cases/[id]
 * Deletes a case owned by the authenticated user.
 */
export async function DELETE(request, { params }) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
    }

    const { id } = params
    if (!id) {
      return NextResponse.json({ message: 'Case ID is required.' }, { status: 400 })
    }

    // Verify ownership
    const existing = await prisma.case.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ message: 'Case not found.' }, { status: 404 })
    }

    await prisma.case.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Case deleted successfully.' })
  } catch (error) {
    console.error('[DELETE /api/cases/[id]]', error)
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
