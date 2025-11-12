import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/presign')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const key = url.searchParams.get('key')
        const expiresIn = parseInt(url.searchParams.get('expiresIn') || '3600')

        if (!key) {
          return new Response(JSON.stringify({ error: 'Key is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        const file = Bun.s3.file(key)
        const presignedUrl = file.presign({
          expiresIn,
        })

        return new Response(JSON.stringify({ url: presignedUrl }), {
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})
