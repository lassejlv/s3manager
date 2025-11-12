import { useState, useCallback } from 'react'
import { Upload, X, FileIcon, Loader2, FolderPlus } from 'lucide-react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Progress } from './ui/progress'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { cn } from '../lib/utils'

interface FileUploadProps {
  currentPath: string
  onUploadComplete: () => void
}

export function FileUpload({ currentPath, onUploadComplete }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [useCustomPrefix, setUseCustomPrefix] = useState(false)
  const [customPrefix, setCustomPrefix] = useState('')

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    setFiles((prev) => [...prev, ...droppedFiles])
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      setFiles((prev) => [...prev, ...selectedFiles])
    }
  }, [])

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const uploadFiles = async () => {
    if (files.length === 0) return

    setUploading(true)
    setProgress(0)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const reader = new FileReader()

        await new Promise((resolve, reject) => {
          reader.onload = async (e) => {
            try {
              const content = e.target?.result as string

              let key = file.name
              if (useCustomPrefix && customPrefix) {
                const cleanPrefix = customPrefix.trim().replace(/^\/+|\/+$/g, '')
                key = cleanPrefix ? `${cleanPrefix}/${file.name}` : file.name
              } else if (currentPath) {
                key = `${currentPath}/${file.name}`
              }

              const response = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  key,
                  content,
                  contentType: file.type || 'application/octet-stream',
                }),
              })

              if (!response.ok) throw new Error('Upload failed')

              setProgress(((i + 1) / files.length) * 100)
              resolve(null)
            } catch (error) {
              reject(error)
            }
          }
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      }

      setFiles([])
      onUploadComplete()
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <Card className='p-6 border-border/40 bg-card/50 backdrop-blur-sm'>
      <div className='mb-6 space-y-4'>
        <div className='flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/40'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-purple-500/10 rounded-lg border border-purple-500/20'>
              <FolderPlus className='w-5 h-5 text-purple-400' />
            </div>
            <div>
              <Label htmlFor='custom-prefix' className='text-sm font-semibold cursor-pointer'>
                Custom Folder Prefix
              </Label>
              <p className='text-xs text-muted-foreground mt-0.5'>Upload to a specific folder path</p>
            </div>
          </div>
          <Switch id='custom-prefix' checked={useCustomPrefix} onCheckedChange={setUseCustomPrefix} className='data-[state=checked]:bg-purple-500' />
        </div>

        {useCustomPrefix && (
          <div className='space-y-2 animate-in slide-in-from-top-2 duration-200'>
            <Label htmlFor='prefix-input' className='text-sm font-medium'>
              Folder Path
            </Label>
            <Input
              id='prefix-input'
              type='text'
              placeholder='e.g., uploads/2024/images'
              value={customPrefix}
              onChange={(e) => setCustomPrefix(e.target.value)}
              className='border-border/40 bg-background/50'
            />
            <p className='text-xs text-muted-foreground'>
              Files will be uploaded to: <span className='font-medium text-foreground'>{customPrefix.trim() || '(root)'}</span>
            </p>
          </div>
        )}
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200',
          isDragging ? 'border-gray-500 bg-gray-500/10 scale-[1.02]' : 'border-border/40 hover:border-border/60',
          files.length > 0 && 'mb-6'
        )}
      >
        <div className={cn('inline-flex p-4 rounded-2xl mb-4 transition-all duration-200', isDragging ? 'bg-gray-500/20 scale-110' : 'bg-muted/30')}>
          <Upload className={cn('w-12 h-12 transition-colors', isDragging ? 'text-gray-400' : 'text-muted-foreground')} />
        </div>
        <p className='text-lg font-semibold mb-2'>Drop files here or click to browse</p>
        <p className='text-sm text-muted-foreground mb-6'>
          {useCustomPrefix ? (
            <>
              Upload to <span className='font-medium text-foreground'>{customPrefix.trim() || 'root'}</span>
            </>
          ) : (
            <>
              Upload to <span className='font-medium text-foreground'>{currentPath || 'root'}</span>
            </>
          )}
        </p>
        <input type='file' multiple onChange={handleFileSelect} className='hidden' id='file-upload' />
        <Button asChild variant='outline' className='border-border/40 hover:bg-accent/50'>
          <label htmlFor='file-upload' className='cursor-pointer'>
            Select Files
          </label>
        </Button>
      </div>

      {files.length > 0 && (
        <div className='space-y-3'>
          <div className='space-y-2'>
            {files.map((file, index) => (
              <div key={index} className='flex items-center gap-4 p-4 bg-muted/30 rounded-xl border border-border/40 hover:bg-muted/50 transition-colors group'>
                <div className='p-2 bg-background/50 rounded-lg border border-border/40'>
                  <FileIcon className='w-5 h-5 text-muted-foreground' />
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-semibold truncate'>{file.name}</p>
                  <p className='text-xs text-muted-foreground mt-0.5'>{formatFileSize(file.size)}</p>
                </div>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => removeFile(index)}
                  disabled={uploading}
                  className='hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity'
                >
                  <X className='w-4 h-4' />
                </Button>
              </div>
            ))}
          </div>

          {uploading && (
            <div className='pt-2 space-y-2'>
              <Progress value={progress} className='h-2' />
              <p className='text-xs text-muted-foreground text-center font-medium'>Uploading... {Math.round(progress)}%</p>
            </div>
          )}

          <Button onClick={uploadFiles} disabled={uploading} className='w-full h-11 text-base font-semibold'>
            {uploading ? (
              <>
                <Loader2 className='w-5 h-5 mr-2 animate-spin' />
                Uploading...
              </>
            ) : (
              <>
                Upload {files.length} {files.length === 1 ? 'file' : 'files'}
              </>
            )}
          </Button>
        </div>
      )}
    </Card>
  )
}
