import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/upload')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json()
        const { key, content } = body

        const file = Bun.s3.file(key)
        await Bun.write(file, content)

        return new Response(JSON.stringify({ success: true, key }), {
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})
