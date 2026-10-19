import { useId, useRef, useState, type DragEvent } from 'react'

interface UploadZoneProps {
  onFile: (file: File) => void
  disabled?: boolean
}

export function UploadZone({ onFile, disabled = false }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const hintId = useId()
  const [dragging, setDragging] = useState(false)

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    if (disabled) return
    const file = event.dataTransfer.files[0]
    if (file) onFile(file)
  }

  return (
    <div
      className={`dropzone${dragging ? ' dropzone--active' : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <p className="dropzone__title">Przeciągnij i upuść plik PDF tutaj</p>
      <p className="dropzone__or">lub</p>
      <button
        type="button"
        className="button button--primary"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        aria-describedby={hintId}
      >
        Wybierz plik PDF
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) onFile(file)
        }}
      />
      <p id={hintId} className="dropzone__hint">
        Tylko PDF z warstwą tekstową, maks. 10 MB.
      </p>
    </div>
  )
}
