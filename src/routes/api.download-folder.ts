import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/download-folder')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const prefix = url.searchParams.get('prefix') || ''

        const result = await Bun.s3.list({ prefix, maxKeys: 1000 })
        const files = result.contents || []

        const JSZip = await import('jszip')
        const zip = new JSZip.default()

        for (const fileObj of files) {
          if (!fileObj.key) continue

          const s3File = Bun.s3.file(fileObj.key)
          const content = await s3File.arrayBuffer()

          const relativePath = prefix ? fileObj.key.slice(prefix.length).replace(/^\//, '') : fileObj.key
          if (relativePath) {
            zip.file(relativePath, content)
          }
        }

        const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' })

        const folderName = prefix.split('/').filter(Boolean).pop() || 'download'

        return new Response(zipBuffer, {
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${folderName}.zip"`,
          },
        })
      },
    },
  },
})
