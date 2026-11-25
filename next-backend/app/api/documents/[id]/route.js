import { NextResponse } from 'next/server'
import { verifyToken } from '../../../../lib/auth.js'
import { prisma } from '../../../../lib/prisma.js'
import { readFile } from '../../../../lib/storage.js'

/**
 * GET /api/documents/[id]
 * Securely streams the stored PDF document for authorized users only.
 * Enforces ownership: only the user who owns the linked case can download/view the document.
 */
export async function GET(request, { params }) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
    }

    const { id } = params
    if (!id) {
      return NextResponse.json({ message: 'Document ID is required.' }, { status: 400 })
    }

    // Find document with linked case to check ownership
    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        case: {
          select: {
            userId: true,
          },
        },
      },
    })

    if (!doc || !doc.case || doc.case.userId !== user.id) {
      return NextResponse.json({ message: 'Document not found.' }, { status: 404 })
    }

    const fileBuffer = await readFile(doc.storagePath)
    if (!fileBuffer) {
      return NextResponse.json({ message: 'Document file missing from server storage.' }, { status: 404 })
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': doc.mimeType || 'application/pdf',
        'Content-Length': fileBuffer.length.toString(),
        'Content-Disposition': `inline; filename="${encodeURIComponent(doc.fileName)}"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('[GET /api/documents/[id]]', error)
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
