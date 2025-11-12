import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/move')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json()
        const { oldKey, newKey } = body

        const oldFile = Bun.s3.file(oldKey)
        const content = await oldFile.arrayBuffer()

        const newFile = Bun.s3.file(newKey)
        await newFile.write(content)

        await oldFile.delete()

        return new Response(JSON.stringify({ success: true, oldKey, newKey }), {
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})
