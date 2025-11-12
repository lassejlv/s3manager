import { useState } from 'react'
import { Folder, FileIcon, Download, Trash2, Link2, MoreVertical, ChevronRight, Home, Calendar, HardDrive, Hash, X } from 'lucide-react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Checkbox } from './ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet'

interface S3Object {
  key: string
  size?: number
  lastModified?: Date | string
  eTag?: string
}

interface FileBrowserProps {
  objects: S3Object[]
  currentPath: string
  onNavigate: (path: string) => void
  onDelete: (key: string) => void
  onDownload: (key: string) => void
  onCopyUrl: (key: string) => void
  onMove?: (oldKey: string, newKey: string) => Promise<void>
  onDownloadFolder?: (folder: string) => void
}

export function FileBrowser({ objects, currentPath, onNavigate, onDelete, onDownload, onCopyUrl, onMove, onDownloadFolder }: FileBrowserProps) {
  const [deleteKey, setDeleteKey] = useState<string | null>(null)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [selectedFile, setSelectedFile] = useState<S3Object | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [draggedFile, setDraggedFile] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  const pathParts = currentPath ? currentPath.split('/').filter(Boolean) : []

  const groupedObjects = objects.reduce(
    (acc, obj) => {
      const relativePath = currentPath ? obj.key.slice(currentPath.length).replace(/^\//, '') : obj.key

      if (!relativePath) return acc

      const parts = relativePath.split('/')

      if (parts.length === 1) {
        acc.files.push(obj)
      } else {
        const folderName = parts[0]
        if (!acc.folders.includes(folderName)) {
          acc.folders.push(folderName)
        }
      }

      return acc
    },
    { folders: [] as string[], files: [] as S3Object[] }
  )

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (date?: Date | string) => {
    if (!date) return 'Unknown'
    return new Date(date).toLocaleString()
  }

  const handleFolderClick = (folder: string) => {
    const newPath = currentPath ? `${currentPath}/${folder}` : folder
    onNavigate(newPath)
  }

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      onNavigate('')
    } else {
      const newPath = pathParts.slice(0, index + 1).join('/')
      onNavigate(newPath)
    }
  }

  const toggleSelection = (key: string) => {
    const newSelected = new Set(selectedKeys)
    if (newSelected.has(key)) {
      newSelected.delete(key)
    } else {
      newSelected.add(key)
    }
    setSelectedKeys(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedKeys.size === groupedObjects.files.length) {
      setSelectedKeys(new Set())
    } else {
      setSelectedKeys(new Set(groupedObjects.files.map((f) => f.key)))
    }
  }

  const handleBulkDelete = async () => {
    for (const key of selectedKeys) {
      await onDelete(key)
    }
    setSelectedKeys(new Set())
    setShowBulkDeleteConfirm(false)
  }

  const clearSelection = () => {
    setSelectedKeys(new Set())
  }

  const handleDragStart = (e: React.DragEvent, fileKey: string) => {
    setDraggedFile(fileKey)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggedFile(null)
    setDropTarget(null)
  }

  const handleDragOver = (e: React.DragEvent, folder: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(folder)
  }

  const handleDragLeave = () => {
    setDropTarget(null)
  }

  const handleDrop = async (e: React.DragEvent, targetFolder: string) => {
    e.preventDefault()
    setDropTarget(null)

    if (!draggedFile || !onMove) return

    const fileName = draggedFile.split('/').pop()
    if (!fileName) return

    const newPath = currentPath ? `${currentPath}/${targetFolder}` : targetFolder
    const newKey = `${newPath}/${fileName}`

    try {
      await onMove(draggedFile, newKey)
    } catch (error) {
      console.error('Failed to move file:', error)
    }

    setDraggedFile(null)
  }

  const handleBreadcrumbDrop = async (e: React.DragEvent, targetPath: string) => {
    e.preventDefault()
    setDropTarget(null)

    if (!draggedFile || !onMove) return

    const fileName = draggedFile.split('/').pop()
    if (!fileName) return

    const newKey = targetPath ? `${targetPath}/${fileName}` : fileName

    try {
      await onMove(draggedFile, newKey)
    } catch (error) {
      console.error('Failed to move file:', error)
    }

    setDraggedFile(null)
  }

  const handleBreadcrumbDragOver = (e: React.DragEvent, path: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(path)
  }

  return (
    <div className='space-y-3'>
      <Card className='p-3 border-border/40 bg-card/50 backdrop-blur-sm'>
        <div className='flex items-center gap-2 text-sm'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => handleBreadcrumbClick(-1)}
            className={`h-8 px-2 hover:bg-accent/50 ${dropTarget === '' ? 'bg-gray-500/20 border-2 border-gray-500 border-dashed' : ''}`}
            onDragOver={(e) => handleBreadcrumbDragOver(e, '')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleBreadcrumbDrop(e, '')}
          >
            <Home className='w-4 h-4' />
          </Button>
          {pathParts.map((part, index) => {
            const targetPath = pathParts.slice(0, index + 1).join('/')
            return (
              <div key={index} className='flex items-center gap-2'>
                <ChevronRight className='w-3.5 h-3.5 text-muted-foreground/50' />
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => handleBreadcrumbClick(index)}
                  className={`h-8 px-2 font-medium hover:bg-accent/50 ${dropTarget === targetPath ? 'bg-gray-500/20 border-2 border-gray-500 border-dashed' : ''}`}
                  onDragOver={(e) => handleBreadcrumbDragOver(e, targetPath)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleBreadcrumbDrop(e, targetPath)}
                >
                  {part}
                </Button>
              </div>
            )
          })}
        </div>
      </Card>

      {selectedKeys.size > 0 && (
        <Card className='p-3 bg-gray-500/5 backdrop-blur-sm border-gray-500/20'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <Badge variant='secondary' className='bg-gray-500/10 text-gray-400 border-gray-500/20'>
                {selectedKeys.size} selected
              </Badge>
              <Button variant='ghost' size='sm' onClick={clearSelection} className='h-7 px-2 text-xs'>
                <X className='w-3 h-3 mr-1' />
                Clear
              </Button>
            </div>
            <div className='flex items-center gap-2'>
              <Button variant='destructive' size='sm' onClick={() => setShowBulkDeleteConfirm(true)} className='h-7 px-3 text-xs'>
                <Trash2 className='w-3 h-3 mr-1' />
                Delete Selected
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className='border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden'>
        <div className='divide-y divide-border/40'>
          {groupedObjects.files.length > 0 && (
            <div className='flex items-center gap-3 px-3 py-2 bg-muted/20 border-b border-border/40'>
              <Checkbox
                checked={selectedKeys.size === groupedObjects.files.length && groupedObjects.files.length > 0}
                onCheckedChange={toggleSelectAll}
                className='ml-1'
              />
              <span className='text-xs font-medium text-muted-foreground'>
                {selectedKeys.size > 0 ? `${selectedKeys.size} of ${groupedObjects.files.length}` : 'Select all'}
              </span>
            </div>
          )}

          {groupedObjects.folders.length === 0 && groupedObjects.files.length === 0 && (
            <div className='p-12 text-center text-muted-foreground'>
              <div className='inline-flex p-3 bg-muted/30 rounded-xl mb-3'>
                <Folder className='w-12 h-12 opacity-30' />
              </div>
              <p className='text-base font-semibold mb-1'>No files or folders</p>
              <p className='text-sm'>Upload files to get started</p>
            </div>
          )}

          {groupedObjects.folders.map((folder) => (
            <div
              key={folder}
              className={`flex items-center gap-3 px-3 py-2.5 hover:bg-accent/30 transition-all duration-150 group ${
                dropTarget === folder ? 'bg-gray-500/20 border-2 border-gray-500 border-dashed' : ''
              }`}
              onDragOver={(e) => handleDragOver(e, folder)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, folder)}
            >
              <div className='flex items-center gap-3 flex-1 min-w-0 cursor-pointer' onClick={() => handleFolderClick(folder)}>
                <div className='p-1.5 bg-gray-500/10 rounded-md border border-gray-500/20 group-hover:bg-gray-500/20 transition-colors'>
                  <Folder className='w-4 h-4 text-gray-400' />
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-semibold'>{folder}</p>
                  {dropTarget === folder && <p className='text-xs text-gray-400'>Drop to move here</p>}
                </div>
                <Badge variant='secondary' className='bg-gray-500/10 text-gray-400 border-gray-500/20 text-xs px-2 py-0'>
                  Folder
                </Badge>
              </div>
              {onDownloadFolder && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant='ghost' size='icon' className='h-7 w-7 hover:bg-accent/50'>
                      <MoreVertical className='w-3.5 h-3.5' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end' className='w-44'>
                    <DropdownMenuItem onClick={() => onDownloadFolder(folder)} className='text-sm'>
                      <Download className='w-3.5 h-3.5 mr-2' />
                      Download as ZIP
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}

          {groupedObjects.files.map((file) => (
            <div
              key={file.key}
              className={`flex items-center gap-3 px-3 py-2.5 hover:bg-accent/30 transition-all duration-150 group ${draggedFile === file.key ? 'opacity-50' : ''}`}
              draggable={!!onMove}
              onDragStart={(e) => handleDragStart(e, file.key)}
              onDragEnd={handleDragEnd}
            >
              <Checkbox checked={selectedKeys.has(file.key)} onCheckedChange={() => toggleSelection(file.key)} onClick={(e) => e.stopPropagation()} />
              <div className='flex items-center gap-3 flex-1 min-w-0 cursor-pointer' onClick={() => setSelectedFile(file)}>
                <div className='p-1.5 bg-muted/50 rounded-md border border-border/40 group-hover:bg-muted transition-colors'>
                  <FileIcon className='w-4 h-4 text-muted-foreground' />
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-semibold truncate'>{file.key.split('/').pop()}</p>
                  <p className='text-xs text-muted-foreground'>
                    {formatFileSize(file.size)} • {formatDate(file.lastModified)}
                  </p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='ghost' size='icon' className='h-7 w-7 hover:bg-accent/50'>
                    <MoreVertical className='w-3.5 h-3.5' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-44'>
                  <DropdownMenuItem onClick={() => onDownload(file.key)} className='text-sm'>
                    <Download className='w-3.5 h-3.5 mr-2' />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCopyUrl(file.key)} className='text-sm'>
                    <Link2 className='w-3.5 h-3.5 mr-2' />
                    Copy URL
                  </DropdownMenuItem>
                  <Separator className='my-1' />
                  <DropdownMenuItem onClick={() => setDeleteKey(file.key)} className='text-destructive focus:text-destructive text-sm'>
                    <Trash2 className='w-3.5 h-3.5 mr-2' />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </Card>

      <AlertDialog open={!!deleteKey} onOpenChange={() => setDeleteKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete "{deleteKey?.split('/').pop()}"? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteKey) {
                  onDelete(deleteKey)
                  setDeleteKey(null)
                }
              }}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <SheetContent className='sm:max-w-md'>
          <SheetHeader>
            <SheetTitle className='text-xl font-semibold truncate'>{selectedFile?.key.split('/').pop()}</SheetTitle>
            <SheetDescription>File information and actions</SheetDescription>
          </SheetHeader>

          {selectedFile && (
            <div className='mt-6 space-y-6'>
              <div className='space-y-4'>
                <div className='flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border/40'>
                  <div className='p-2 bg-gray-500/10 rounded-lg border border-gray-500/20 mt-0.5'>
                    <HardDrive className='w-4 h-4 text-gray-400' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1'>Size</p>
                    <p className='text-sm font-semibold'>{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>

                <div className='flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border/40'>
                  <div className='p-2 bg-green-500/10 rounded-lg border border-green-500/20 mt-0.5'>
                    <Calendar className='w-4 h-4 text-green-400' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1'>Last Modified</p>
                    <p className='text-sm font-semibold'>{formatDate(selectedFile.lastModified)}</p>
                  </div>
                </div>

                <div className='flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border/40'>
                  <div className='p-2 bg-purple-500/10 rounded-lg border border-purple-500/20 mt-0.5'>
                    <Hash className='w-4 h-4 text-purple-400' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1'>ETag</p>
                    <p className='text-xs font-mono break-all'>{selectedFile.eTag || 'N/A'}</p>
                  </div>
                </div>

                <div className='flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border/40'>
                  <div className='p-2 bg-orange-500/10 rounded-lg border border-orange-500/20 mt-0.5'>
                    <FileIcon className='w-4 h-4 text-orange-400' />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1'>Full Path</p>
                    <p className='text-xs font-mono break-all'>{selectedFile.key}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className='space-y-2'>
                <Button
                  onClick={() => {
                    onDownload(selectedFile.key)
                    setSelectedFile(null)
                  }}
                  className='w-full'
                  variant='default'
                >
                  <Download className='w-4 h-4 mr-2' />
                  Download File
                </Button>

                <Button
                  onClick={() => {
                    onCopyUrl(selectedFile.key)
                    setSelectedFile(null)
                  }}
                  className='w-full'
                  variant='outline'
                >
                  <Link2 className='w-4 h-4 mr-2' />
                  Copy Presigned URL
                </Button>

                <Button
                  onClick={() => {
                    setDeleteKey(selectedFile.key)
                    setSelectedFile(null)
                  }}
                  className='w-full'
                  variant='destructive'
                >
                  <Trash2 className='w-4 h-4 mr-2' />
                  Delete File
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedKeys.size} files?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {selectedKeys.size} file{selectedKeys.size > 1 ? 's' : ''} from your S3 bucket.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
