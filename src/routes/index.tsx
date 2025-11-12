import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { RefreshCw, Database, HardDrive, Upload as UploadIcon, FolderOpen, Settings, Trash2, AlertTriangle } from 'lucide-react'
import { FileBrowser } from '../components/FileBrowser'
import { FileUpload } from '../components/FileUpload'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog'
import { toast } from 'sonner'
import { z } from 'zod'

const searchSchema = z.object({
  path: z.string().optional().default(''),
  tab: z.enum(['browse', 'upload', 'settings']).optional().default('browse'),
})

export const Route = createFileRoute('/')({
  component: RouteComponent,
  validateSearch: searchSchema,
})

function RouteComponent() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const [currentPath, setCurrentPath] = useState(search.path || '')
  const [activeTab, setActiveTab] = useState<'browse' | 'upload' | 'settings'>(search.tab || 'browse')
  const [showEmptyBucketConfirm, setShowEmptyBucketConfirm] = useState(false)
  const [isEmptyingBucket, setIsEmptyingBucket] = useState(false)

  useEffect(() => {
    setCurrentPath(search.path || '')
    setActiveTab(search.tab || 'browse')
  }, [search.path, search.tab])

  const { data, refetch, isRefetching } = useQuery({
    queryKey: ['s3-objects', currentPath],
    queryFn: async () => {
      const response = await fetch(`/api/list?prefix=${encodeURIComponent(currentPath)}`)
      if (!response.ok) throw new Error('Failed to fetch objects')
      return response.json()
    },
  })

  const handleNavigate = (path: string) => {
    navigate({
      to: '/',
      search: {
        path,
        tab: activeTab,
      },
    })
  }

  const handleTabChange = (value: string) => {
    const tab = value as 'browse' | 'upload' | 'settings'
    navigate({
      to: '/',
      search: {
        path: currentPath,
        tab,
      },
    })
  }

  const handleDelete = async (key: string) => {
    try {
      const response = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })
      if (!response.ok) throw new Error('Failed to delete')
      toast.success('File deleted successfully')
      refetch()
    } catch (error) {
      toast.error('Failed to delete file')
      console.error(error)
    }
  }

  const handleDownload = async (key: string) => {
    try {
      const response = await fetch(`/api/presign?key=${encodeURIComponent(key)}&expiresIn=300`)
      if (!response.ok) throw new Error('Failed to generate URL')
      const result = await response.json()
      window.open(result.url, '_blank')
      toast.success('Opening download link')
    } catch (error) {
      toast.error('Failed to generate download link')
      console.error(error)
    }
  }

  const handleCopyUrl = async (key: string) => {
    try {
      const response = await fetch(`/api/presign?key=${encodeURIComponent(key)}&expiresIn=3600`)
      if (!response.ok) throw new Error('Failed to generate URL')
      const result = await response.json()
      await navigator.clipboard.writeText(result.url)
      toast.success('URL copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy URL')
      console.error(error)
    }
  }

  const handleUploadComplete = () => {
    refetch()
    navigate({
      to: '/',
      search: {
        path: currentPath,
        tab: 'browse',
      },
    })
    toast.success('Upload completed successfully')
  }

  const handleMove = async (oldKey: string, newKey: string) => {
    try {
      const response = await fetch('/api/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldKey, newKey }),
      })
      if (!response.ok) throw new Error('Failed to move file')
      toast.success('File moved successfully')
      refetch()
    } catch (error) {
      toast.error('Failed to move file')
      console.error(error)
      throw error
    }
  }

  const handleDownloadFolder = (folder: string) => {
    const folderPath = currentPath ? `${currentPath}/${folder}` : folder
    const url = `/api/download-folder?prefix=${encodeURIComponent(folderPath)}`
    window.open(url, '_blank')
    toast.success('Downloading folder as ZIP...')
  }

  const handleEmptyBucket = async () => {
    setIsEmptyingBucket(true)
    try {
      const allObjects = await fetch('/api/list?prefix=')
      const { contents } = await allObjects.json()

      if (!contents || contents.length === 0) {
        toast.info('Bucket is already empty')
        setShowEmptyBucketConfirm(false)
        setIsEmptyingBucket(false)
        return
      }

      let deleted = 0
      for (const obj of contents) {
        if (obj.key) {
          await fetch('/api/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: obj.key }),
          })
          deleted++
        }
      }

      toast.success(`Successfully deleted ${deleted} objects`)
      refetch()
    } catch (error) {
      toast.error('Failed to empty bucket')
      console.error(error)
    } finally {
      setIsEmptyingBucket(false)
      setShowEmptyBucketConfirm(false)
    }
  }

  const objects = data?.contents || []

  if (!data) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center'>
        <div className='text-center'>
          <Database className='w-16 h-16 mx-auto mb-4 text-muted-foreground animate-pulse' />
          <p className='text-lg font-medium'>Loading S3 bucket...</p>
        </div>
      </div>
    )
  }
  const totalSize = objects.reduce((acc: number, obj: any) => acc + (obj.size || 0), 0)
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950'>
      <div className='border-b border-white/5 backdrop-blur-xl bg-gray-950/80 sticky top-0 z-50 shadow-lg shadow-black/20'>
        <div className='container mx-auto px-6 py-5'>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-2xl font-bold tracking-tight text-gray-400'>S3 Browser</h1>
              <p className='text-sm text-gray-400'>Manage your cloud storage</p>
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={() => refetch()}
              disabled={isRefetching}
              className='border-white/10 bg-white/5 hover:bg-white/10 text-white'
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className='container mx-auto px-6 py-8'>
        <div className='grid gap-4 mb-8 md:grid-cols-3'>
          <Card className='border-white/10 bg-gradient-to-br from-gray-900/90 to-gray-900/50 backdrop-blur-xl hover:from-gray-900 hover:to-gray-900/70 transition-all duration-300 shadow-xl shadow-black/20'>
            <div className='flex items-center gap-4 p-5'>
              <div className='p-3 bg-gradient-to-br from-gray-500/20 to-gray-600/10 rounded-xl border border-gray-500/30 shadow-lg shadow-gray-500/10'>
                <HardDrive className='w-5 h-5 text-gray-400' />
              </div>
              <div>
                <p className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>Total Objects</p>
                <p className='text-3xl font-bold text-white mt-1'>{objects.length}</p>
              </div>
            </div>
          </Card>

          <Card className='border-white/10 bg-gradient-to-br from-gray-900/90 to-gray-900/50 backdrop-blur-xl hover:from-gray-900 hover:to-gray-900/70 transition-all duration-300 shadow-xl shadow-black/20'>
            <div className='flex items-center gap-4 p-5'>
              <div className='p-3 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-xl border border-emerald-500/30 shadow-lg shadow-emerald-500/10'>
                <Database className='w-5 h-5 text-emerald-400' />
              </div>
              <div>
                <p className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>Total Size</p>
                <p className='text-3xl font-bold text-white mt-1'>{formatSize(totalSize)}</p>
              </div>
            </div>
          </Card>

          <Card className='border-white/10 bg-gradient-to-br from-gray-900/90 to-gray-900/50 backdrop-blur-xl hover:from-gray-900 hover:to-gray-900/70 transition-all duration-300 shadow-xl shadow-black/20'>
            <div className='flex items-center gap-4 p-5'>
              <div className='p-3 bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl border border-purple-500/30 shadow-lg shadow-purple-500/10'>
                <FolderOpen className='w-5 h-5 text-purple-400' />
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>Current Path</p>
                <p className='text-lg font-bold text-white mt-1 truncate'>{currentPath || '/'}</p>
              </div>
            </div>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className='w-full'>
          <TabsList className='grid w-full max-w-md grid-cols-3 bg-zinc-900/50 border border-white/10 p-1 h-11 shadow-xl'>
            <TabsTrigger
              value='browse'
              className='data-[state=active]:bg-gradient-to-br data-[state=active]:from-gray-500/20 data-[state=active]:to-gray-600/10 data-[state=active]:border data-[state=active]:border-gray-500/30 data-[state=active]:text-white text-gray-400 data-[state=active]:shadow-lg transition-all'
            >
              <FolderOpen className='w-4 h-4 mr-2' />
              Browse
            </TabsTrigger>
            <TabsTrigger
              value='upload'
              className='data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-500/20 data-[state=active]:to-purple-600/10 data-[state=active]:border data-[state=active]:border-purple-500/30 data-[state=active]:text-white text-gray-400 data-[state=active]:shadow-lg transition-all'
            >
              <UploadIcon className='w-4 h-4 mr-2' />
              Upload
            </TabsTrigger>
            <TabsTrigger
              value='settings'
              className='data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-500/20 data-[state=active]:to-orange-600/10 data-[state=active]:border data-[state=active]:border-orange-500/30 data-[state=active]:text-white text-gray-400 data-[state=active]:shadow-lg transition-all'
            >
              <Settings className='w-4 h-4 mr-2' />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value='browse' className='mt-6'>
            <FileBrowser
              objects={objects}
              currentPath={currentPath}
              onNavigate={handleNavigate}
              onDelete={handleDelete}
              onDownload={handleDownload}
              onCopyUrl={handleCopyUrl}
              onMove={handleMove}
              onDownloadFolder={handleDownloadFolder}
            />
          </TabsContent>

          <TabsContent value='upload' className='mt-6'>
            <FileUpload currentPath={currentPath} onUploadComplete={handleUploadComplete} />
          </TabsContent>

          <TabsContent value='settings' className='mt-6'>
            <Card className='border-white/10 bg-gradient-to-br from-gray-900/90 to-gray-900/50 backdrop-blur-xl shadow-xl shadow-black/20'>
              <CardHeader>
                <CardTitle className='text-white flex items-center gap-2'>
                  <Settings className='w-5 h-5' />
                  Bucket Settings
                </CardTitle>
                <CardDescription className='text-gray-400'>Manage your S3 bucket configuration</CardDescription>
              </CardHeader>
              <CardContent className='space-y-6'>
                <div className='p-5 rounded-xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-600/5'>
                  <div className='flex items-start gap-4'>
                    <div className='p-2.5 bg-red-500/20 rounded-lg border border-red-500/30'>
                      <AlertTriangle className='w-5 h-5 text-red-400' />
                    </div>
                    <div className='flex-1'>
                      <h3 className='text-lg font-semibold text-white mb-1'>Danger Zone</h3>
                      <p className='text-sm text-gray-300 mb-4'>Permanently delete all objects in this bucket. This action cannot be undone.</p>
                      <Button
                        variant='destructive'
                        onClick={() => setShowEmptyBucketConfirm(true)}
                        disabled={isEmptyingBucket}
                        className='bg-red-600 hover:bg-red-700 text-white shadow-lg'
                      >
                        <Trash2 className='w-4 h-4 mr-2' />
                        {isEmptyingBucket ? 'Emptying Bucket...' : 'Empty Bucket'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className='p-5 rounded-xl border border-white/10 bg-gray-900/50'>
                  <h3 className='text-lg font-semibold text-white mb-3'>Bucket Information</h3>
                  <div className='space-y-3 text-sm'>
                    <div className='flex justify-between items-center py-2 border-b border-white/5'>
                      <span className='text-gray-400'>Total Objects</span>
                      <span className='font-semibold text-white'>{objects.length}</span>
                    </div>
                    <div className='flex justify-between items-center py-2 border-b border-white/5'>
                      <span className='text-gray-400'>Total Size</span>
                      <span className='font-semibold text-white'>{formatSize(totalSize)}</span>
                    </div>
                    <div className='flex justify-between items-center py-2'>
                      <span className='text-gray-400'>Current Path</span>
                      <span className='font-semibold text-white font-mono'>{currentPath || '/'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={showEmptyBucketConfirm} onOpenChange={setShowEmptyBucketConfirm}>
        <AlertDialogContent className='border-white/10 bg-gray-900'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-white flex items-center gap-2'>
              <AlertTriangle className='w-5 h-5 text-red-400' />
              Empty Entire Bucket?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-gray-300'>
              This will permanently delete <span className='font-bold text-white'>{objects.length} objects</span> from your S3 bucket. This action cannot be undone
              and may take a while to complete.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='border-white/10 bg-white/5 hover:bg-white/10 text-white'>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEmptyBucket} disabled={isEmptyingBucket} className='bg-red-600 hover:bg-red-700 text-white'>
              {isEmptyingBucket ? 'Deleting...' : 'Yes, Empty Bucket'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
