import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/list')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const prefix = url.searchParams.get('prefix') || ''

        const result = await Bun.s3.list({
          prefix,
          maxKeys: 1000,
        })

        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})
