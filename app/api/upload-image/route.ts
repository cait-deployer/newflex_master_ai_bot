import { put } from '@vercel/blob'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('[v0] Uploading image to Vercel Blob:', file.name, 'size:', file.size)

    // Upload to Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
      contentType: 'image/png',
    })

    console.log('[v0] Image uploaded:', blob.url)

    return Response.json({ 
      success: true, 
      url: blob.url,
      name: file.name 
    })
  } catch (error) {
    console.error('[v0] Error uploading image:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: `Failed to upload image: ${errorMessage}` }, { status: 500 })
  }
}
