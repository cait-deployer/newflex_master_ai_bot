export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return Response.json({ error: 'This endpoint is deprecated' }, { status: 410 })
}
