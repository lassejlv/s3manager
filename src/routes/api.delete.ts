import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/delete')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json()
        const { key } = body

        const file = Bun.s3.file(key)
        await file.delete()

        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})
