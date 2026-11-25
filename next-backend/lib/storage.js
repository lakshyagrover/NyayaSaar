// Saves and reads uploaded PDF files.
//
// On Vercel the server disk is wiped after every request, so files are stored in
// Vercel Blob (online file storage) when BLOB_READ_WRITE_TOKEN is set.
// On your own laptop (no token) files are saved in next-backend/storage/uploads as before.

import fs from 'fs'
import path from 'path'
import { put, del } from '@vercel/blob'

const LOCAL_DIR = path.join(process.cwd(), 'storage', 'uploads')
const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN)

// Save a PDF. Returns the "storagePath" we keep in the database
// (a Blob URL online, or a file path on the laptop).
export async function saveFile(fileName, buffer) {
  if (useBlob()) {
    const blob = await put(`judgments/${fileName}`, buffer, {
      access: 'public',
      contentType: 'application/pdf',
      addRandomSuffix: true, // makes the URL hard to guess
    })
    return blob.url
  }

  await fs.promises.mkdir(LOCAL_DIR, { recursive: true })
  const filePath = path.join(LOCAL_DIR, fileName)
  await fs.promises.writeFile(filePath, buffer)
  return filePath
}

// Read a saved PDF back as a Buffer. Returns null if it is missing.
export async function readFile(storagePath) {
  if (!storagePath) return null

  if (storagePath.startsWith('http')) {
    const res = await fetch(storagePath)
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  }

  if (!fs.existsSync(storagePath)) return null
  return fs.promises.readFile(storagePath)
}

// Delete a saved PDF (errors are ignored).
export async function deleteFile(storagePath) {
  if (!storagePath) return
  try {
    if (storagePath.startsWith('http')) await del(storagePath)
    else if (fs.existsSync(storagePath)) await fs.promises.unlink(storagePath)
  } catch {}
}
