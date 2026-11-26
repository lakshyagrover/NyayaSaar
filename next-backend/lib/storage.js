import fs from 'fs'
import path from 'path'
import { put, del } from '@vercel/blob'

const LOCAL_DIR = path.join(process.cwd(), 'storage', 'uploads')
const isBlobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN)

export async function saveFile(fileName, buffer) {
  if (isBlobEnabled()) {
    const blob = await put(`judgments/${fileName}`, buffer, {
      access: 'public',
      contentType: 'application/pdf',
      addRandomSuffix: true,
    })
    return blob.url
  }

  await fs.promises.mkdir(LOCAL_DIR, { recursive: true })
  const filePath = path.join(LOCAL_DIR, fileName)
  await fs.promises.writeFile(filePath, buffer)
  return filePath
}

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

export async function deleteFile(storagePath) {
  if (!storagePath) return
  try {
    if (storagePath.startsWith('http')) await del(storagePath)
    else if (fs.existsSync(storagePath)) await fs.promises.unlink(storagePath)
  } catch {}
}
