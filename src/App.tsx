import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, KeyboardEvent, PointerEvent } from 'react'
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowsOutCardinal,
  CalendarBlank,
  CheckCircle,
  DownloadSimple,
  ImageSquare,
  Minus,
  Plus,
  ShieldCheck,
  Tent,
  UploadSimple,
  WarningCircle,
} from '@phosphor-icons/react'
import {
  createExport,
  getPhotoRect,
  loadTemplate,
  renderTwibbon,
  TEMPLATE_HEIGHT,
  TEMPLATE_WIDTH,
} from './twibbon'
import type { PhotoState } from './twibbon'
import './styles.css'

type FormErrors = { name?: string; role?: string; photo?: string }
type DragState = {
  pointerId: number
  clientX: number
  clientY: number
  offsetX: number
  offsetY: number
}

const MAX_PHOTO_SIZE = 20 * 1024 * 1024
const SUPPORTED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function constrainPhoto(photo: PhotoState): PhotoState {
  const rect = getPhotoRect()
  const swapped = Math.abs(photo.rotation % 180) === 90
  const width = swapped ? photo.image.naturalHeight : photo.image.naturalWidth
  const height = swapped ? photo.image.naturalWidth : photo.image.naturalHeight
  const scale = Math.max(rect.width / width, rect.height / height) * photo.zoom
  const limitX = Math.max(0, (width * scale - rect.width) / 2)
  const limitY = Math.max(0, (height * scale - rect.height) / 2)
  return {
    ...photo,
    offsetX: Math.max(-limitX, Math.min(limitX, photo.offsetX)),
    offsetY: Math.max(-limitY, Math.min(limitY, photo.offsetY)),
  }
}

async function readPhoto(file: File): Promise<{ image: HTMLImageElement; url: string }> {
  let url = URL.createObjectURL(file)
  try {
    let image = new Image()
    image.src = url
    await image.decode()
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('Invalid image')

    // A smaller working image keeps dragging and export comfortable on phones.
    const longestEdge = Math.max(image.naturalWidth, image.naturalHeight)
    if (longestEdge > 2400) {
      const scale = 2400 / longestEdge
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas unavailable')
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Image conversion failed')), 'image/webp', 0.95)
      })
      URL.revokeObjectURL(url)
      url = URL.createObjectURL(blob)
      image = new Image()
      image.src = url
      await image.decode()
    }
    return { image, url }
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
}

export default function App() {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [photo, setPhoto] = useState<PhotoState | null>(null)
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoName, setPhotoName] = useState('')
  const [photoLoading, setPhotoLoading] = useState(false)
  const [templateReady, setTemplateReady] = useState(false)
  const [templateError, setTemplateError] = useState('')
  const [templateAttempt, setTemplateAttempt] = useState(0)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [exporting, setExporting] = useState(false)
  const [status, setStatus] = useState('')
  const [exportError, setExportError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [fileHover, setFileHover] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const photoRef = useRef<PhotoState | null>(null)
  const photoUrlRef = useRef('')
  const nameRef = useRef(name)
  const roleRef = useRef(role)
  const dragRef = useRef<DragState | null>(null)
  const frameRef = useRef<number | null>(null)
  const uploadRequestRef = useRef(0)
  const exportUrlsRef = useRef<string[]>([])
  nameRef.current = name
  roleRef.current = role

  useEffect(() => {
    let active = true
    setTemplateReady(false)
    setTemplateError('')
    loadTemplate()
      .then(() => { if (active) setTemplateReady(true) })
      .catch(() => { if (active) setTemplateError('Template belum dapat dimuat. Periksa koneksi lalu coba kembali.') })
    return () => { active = false }
  }, [templateAttempt])

  useEffect(() => {
    if (!templateReady || !canvasRef.current) return
    try {
      renderTwibbon(canvasRef.current, { name, role, photo: photoRef.current })
    } catch {
      setTemplateReady(false)
      setTemplateError('Pratinjau tidak dapat ditampilkan. Coba muat ulang atau gunakan browser terbaru.')
    }
  }, [name, role, photo, templateReady])

  useEffect(() => () => {
    uploadRequestRef.current += 1
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current)
    exportUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  function updatePhoto(next: PhotoState) {
    const constrained = constrainPhoto(next)
    photoRef.current = constrained
    setPhoto(constrained)
    setStatus('')
    setExportError('')
  }

  async function choosePhoto(file: File | undefined) {
    if (!file) return
    const request = ++uploadRequestRef.current
    if (!SUPPORTED_PHOTO_TYPES.has(file.type)) {
      setPhotoLoading(false)
      setFormErrors((current) => ({ ...current, photo: 'Pilih foto dalam format JPG, PNG, atau WebP.' }))
      return
    }
    if (file.size > MAX_PHOTO_SIZE) {
      setPhotoLoading(false)
      setFormErrors((current) => ({ ...current, photo: 'Ukuran foto maksimal 20 MB. Pilih foto yang lebih kecil.' }))
      return
    }

    setPhotoLoading(true)
    setFormErrors((current) => ({ ...current, photo: undefined }))
    setStatus('')
    setExportError('')
    try {
      const loaded = await readPhoto(file)
      if (request !== uploadRequestRef.current) {
        URL.revokeObjectURL(loaded.url)
        return
      }
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current)
      photoUrlRef.current = loaded.url
      setPhotoUrl(loaded.url)
      setPhotoName(file.name)
      updatePhoto({ image: loaded.image, zoom: 1, rotation: 0, offsetX: 0, offsetY: 0 })
    } catch {
      if (request === uploadRequestRef.current) {
        setFormErrors((current) => ({ ...current, photo: 'Foto tidak dapat dibaca. Coba pilih foto lainnya.' }))
      }
    } finally {
      if (request === uploadRequestRef.current) setPhotoLoading(false)
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    void choosePhoto(event.target.files?.[0])
    event.target.value = ''
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (!photoRef.current || !templateReady || dragRef.current || event.button !== 0) return
    const bounds = canvasRef.current?.getBoundingClientRect()
    if (!bounds) return
    const x = (event.clientX - bounds.left) * TEMPLATE_WIDTH / bounds.width
    const y = (event.clientY - bounds.top) * TEMPLATE_HEIGHT / bounds.height
    const rect = getPhotoRect()
    if (x < rect.x || x > rect.x + rect.width || y < rect.y || y > rect.y + rect.height) return
    event.preventDefault()
    canvasRef.current?.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      offsetX: photoRef.current.offsetX,
      offsetY: photoRef.current.offsetY,
    }
    setDragging(true)
    setStatus('')
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    const currentPhoto = photoRef.current
    if (!drag || !currentPhoto || drag.pointerId !== event.pointerId) return
    const bounds = canvasRef.current?.getBoundingClientRect()
    if (!bounds) return
    photoRef.current = constrainPhoto({
      ...currentPhoto,
      offsetX: drag.offsetX + (event.clientX - drag.clientX) * TEMPLATE_WIDTH / bounds.width,
      offsetY: drag.offsetY + (event.clientY - drag.clientY) * TEMPLATE_HEIGHT / bounds.height,
    })
    if (frameRef.current !== null) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      if (canvasRef.current) {
        renderTwibbon(canvasRef.current, {
          name: nameRef.current,
          role: roleRef.current,
          photo: photoRef.current,
        })
      }
    })
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    setDragging(false)
    setPhoto(photoRef.current)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function moveWithKeyboard(event: KeyboardEvent<HTMLCanvasElement>) {
    const current = photoRef.current
    if (!current || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault()
    const distance = event.shiftKey ? 30 : 10
    updatePhoto({
      ...current,
      offsetX: current.offsetX + (event.key === 'ArrowLeft' ? -distance : event.key === 'ArrowRight' ? distance : 0),
      offsetY: current.offsetY + (event.key === 'ArrowUp' ? -distance : event.key === 'ArrowDown' ? distance : 0),
    })
  }

  function changeZoom(value: number) {
    if (photoRef.current) updatePhoto({ ...photoRef.current, zoom: Math.max(1, Math.min(3, value)) })
  }

  function rotatePhoto(direction: -1 | 1) {
    if (photoRef.current) {
      updatePhoto({ ...photoRef.current, rotation: (photoRef.current.rotation + direction * 90 + 360) % 360, offsetX: 0, offsetY: 0 })
    }
  }

  async function handleDownload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors: FormErrors = {}
    if (!name.trim()) errors.name = 'Isi nama yang akan ditampilkan.'
    if (!role.trim()) errors.role = 'Isi jabatan atau nama pangkalan.'
    if (!photoRef.current) errors.photo = 'Pilih foto terlebih dahulu.'
    setFormErrors(errors)
    if (Object.keys(errors).length || !templateReady || photoLoading || exporting) return
    setExporting(true)
    setStatus('')
    setExportError('')
    try {
      const blob = await createExport({ name: name.trim(), role: role.trim(), photo: photoRef.current })
      const url = URL.createObjectURL(blob)
      exportUrlsRef.current.push(url)
      const link = document.createElement('a')
      const slug = name.trim().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'peserta'
      link.href = url
      link.download = `twibbon-gelora-pahlawan-${slug}.png`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => {
        URL.revokeObjectURL(url)
        exportUrlsRef.current = exportUrlsRef.current.filter((item) => item !== url)
      }, 10_000)
      setStatus('Twibbon berhasil diunduh. Siap untuk dibagikan!')
    } catch {
      setExportError('Twibbon belum dapat diunduh. Silakan coba kembali.')
    } finally {
      setExporting(false)
    }
  }

  const complete = Boolean(name.trim() && role.trim() && photo && templateReady && !photoLoading)
  const photoRect = getPhotoRect()

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-symbol" aria-hidden="true"><Tent size={27} weight="duotone" /></span>
            <div><span className="brand-name">Gelora Pahlawan</span><span className="brand-subtitle">Kemah Besar Penggalang</span></div>
          </div>
          <div className="event-date"><CalendarBlank size={18} aria-hidden="true" /><span>13–15 November 2026</span></div>
        </div>
      </header>

      <main className="editor-layout">
        <section className="editor-column" aria-labelledby="editor-title">
          <div className="page-intro">
            <span className="eyebrow">SATU BINGKAI, SATU SEMANGAT</span>
            <h1 id="editor-title">Buat twibbonmu.</h1>
            <p>Lengkapi identitas dan foto terbaikmu.<br />Mari ramaikan Gelora Pahlawan!</p>
          </div>

          <form className="editor-form" onSubmit={handleDownload} noValidate>
            <div className="text-fields">
              <div className="field">
                <label htmlFor="participant-name">Nama <span aria-hidden="true">*</span></label>
                <input
                  id="participant-name"
                  name="nama"
                  type="text"
                  autoComplete="name"
                  placeholder="Masukkan nama kamu"
                  value={name}
                  maxLength={80}
                  required
                  aria-invalid={Boolean(formErrors.name)}
                  aria-describedby={formErrors.name ? 'name-error' : undefined}
                  onChange={(event) => {
                    setName(event.target.value)
                    setFormErrors((current) => ({ ...current, name: undefined }))
                    setStatus('')
                  }}
                />
                {formErrors.name && <p className="field-error" id="name-error">{formErrors.name}</p>}
              </div>
              <div className="field">
                <label htmlFor="participant-role">Jabatan / Pangkalan <span aria-hidden="true">*</span></label>
                <input
                  id="participant-role"
                  name="jabatan-pangkalan"
                  type="text"
                  autoComplete="organization"
                  placeholder="Contoh: Penggalang / SMP Negeri 1"
                  value={role}
                  maxLength={120}
                  required
                  aria-invalid={Boolean(formErrors.role)}
                  aria-describedby={formErrors.role ? 'role-error' : undefined}
                  onChange={(event) => {
                    setRole(event.target.value)
                    setFormErrors((current) => ({ ...current, role: undefined }))
                    setStatus('')
                  }}
                />
                {formErrors.role && <p className="field-error" id="role-error">{formErrors.role}</p>}
              </div>
            </div>

            <div className="field photo-field">
              <label htmlFor="participant-photo">Foto <span aria-hidden="true">*</span></label>
              <input
                ref={fileRef}
                className="visually-hidden"
                id="participant-photo"
                name="foto"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                tabIndex={-1}
                aria-invalid={Boolean(formErrors.photo)}
                aria-describedby={formErrors.photo ? 'photo-error' : 'photo-format'}
                onChange={handleFileChange}
              />
              <div
                className={`upload-area ${photo ? 'has-selection' : ''} ${fileHover ? 'file-hover' : ''} ${formErrors.photo ? 'has-error' : ''}`}
                aria-busy={photoLoading}
                onDragOver={(event) => { event.preventDefault(); setFileHover(true) }}
                onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setFileHover(false) }}
                onDrop={(event) => {
                  event.preventDefault()
                  setFileHover(false)
                  void choosePhoto(event.dataTransfer.files[0])
                }}
              >
                <button className="upload-button" type="button" onClick={() => fileRef.current?.click()} disabled={photoLoading}>
                  {photo && photoUrl ? <img className="photo-thumbnail" src={photoUrl} alt="" /> : <span className="upload-icon"><UploadSimple size={25} aria-hidden="true" /></span>}
                  <span className="upload-copy">
                    <strong>{photoLoading ? 'Menyiapkan foto...' : photo ? 'Ganti foto' : 'Pilih foto'}</strong>
                    <span>{photo ? photoName : 'atau seret foto ke sini'}</span>
                  </span>
                  {photo && !photoLoading && <UploadSimple className="replace-icon" size={19} aria-hidden="true" />}
                </button>
              </div>
              <p className="field-hint" id="photo-format">JPG, PNG, atau WebP. Maksimal 20 MB.</p>
              {formErrors.photo && <p className="field-error" id="photo-error" role="alert">{formErrors.photo}</p>}
            </div>

            {photo && (
              <div className="photo-settings">
                <div className="settings-heading">
                  <span>Atur foto</span>
                  <button className="text-button" type="button" onClick={() => updatePhoto({ ...photo, zoom: 1, rotation: 0, offsetX: 0, offsetY: 0 })}>Reset</button>
                </div>
                <div className="zoom-label"><label htmlFor="photo-zoom">Perbesar foto</label><output htmlFor="photo-zoom">{Math.round(photo.zoom * 100)}%</output></div>
                <div className="zoom-control">
                  <button type="button" className="icon-button" aria-label="Perkecil foto" onClick={() => changeZoom(photo.zoom - 0.1)} disabled={photo.zoom <= 1}><Minus size={17} aria-hidden="true" /></button>
                  <input id="photo-zoom" type="range" min="1" max="3" step="0.01" value={photo.zoom} onChange={(event) => changeZoom(Number(event.target.value))} aria-label="Perbesar foto" />
                  <button type="button" className="icon-button" aria-label="Perbesar foto" onClick={() => changeZoom(photo.zoom + 0.1)} disabled={photo.zoom >= 3}><Plus size={17} aria-hidden="true" /></button>
                </div>
                <div className="rotation-controls">
                  <span>Putar foto <output aria-live="polite">({photo.rotation}°)</output></span>
                  <button type="button" className="rotation-button" aria-label="Putar foto 90 derajat ke kiri" onClick={() => rotatePhoto(-1)}><ArrowCounterClockwise size={18} aria-hidden="true" /><span>90°</span></button>
                  <button type="button" className="rotation-button" aria-label="Putar foto 90 derajat ke kanan" onClick={() => rotatePhoto(1)}><ArrowClockwise size={18} aria-hidden="true" /><span>90°</span></button>
                </div>
              </div>
            )}

            <div className="download-section">
              <button className="download-button" type="submit" disabled={!complete || exporting}>
                <DownloadSimple size={21} weight="bold" aria-hidden="true" />
                <span>{exporting ? 'Menyiapkan twibbon...' : 'Unduh twibbon'}</span>
              </button>
              <p className="download-hint">{complete ? 'PNG berkualitas tinggi, siap dibagikan.' : 'Lengkapi ketiga isian untuk mengunduh.'}</p>
              <div className="form-status" aria-live="polite" aria-atomic="true">
                {status && <p className="success-message"><CheckCircle size={18} aria-hidden="true" />{status}</p>}
                {exportError && <p className="field-error"><WarningCircle size={18} aria-hidden="true" />{exportError}</p>}
              </div>
            </div>
          </form>
        </section>

        <section className="preview-column" aria-labelledby="preview-title">
          <div className="preview-heading"><h2 id="preview-title">Pratinjau twibbon</h2><span>1080 × 1350 px</span></div>
          <div className={`preview-stage ${photo ? 'has-photo' : ''} ${dragging ? 'is-dragging' : ''}`}>
            <div className="canvas-frame">
              <canvas
                ref={canvasRef}
                width={TEMPLATE_WIDTH}
                height={TEMPLATE_HEIGHT}
                role="img"
                aria-label={`Pratinjau twibbon Gelora Pahlawan${name.trim() ? ` untuk ${name.trim()}` : ''}${role.trim() ? `, ${role.trim()}` : ''}`}
                aria-describedby={photo ? 'photo-controls-hint' : 'preview-hint'}
                tabIndex={photo && templateReady ? 0 : -1}
                onKeyDown={moveWithKeyboard}
              />
              {photo && templateReady && <div
                className="photo-drag-area"
                aria-hidden="true"
                style={{
                  left: `${photoRect.x / TEMPLATE_WIDTH * 100}%`,
                  top: `${photoRect.y / TEMPLATE_HEIGHT * 100}%`,
                  width: `${photoRect.width / TEMPLATE_WIDTH * 100}%`,
                  height: `${492 / TEMPLATE_HEIGHT * 100}%`,
                }}
                onPointerDown={startDrag}
                onPointerMove={moveDrag}
                onPointerUp={finishDrag}
                onPointerCancel={finishDrag}
                onLostPointerCapture={finishDrag}
              />}
              {!templateReady && <div className="preview-fallback" aria-live="polite">
                <ImageSquare size={42} weight="light" aria-hidden="true" />
                <strong>{templateError ? 'Pratinjau belum tersedia' : 'Menyiapkan bingkai...'}</strong>
                {templateError && <><p>{templateError}</p><button type="button" className="retry-button" onClick={() => setTemplateAttempt((value) => value + 1)}>Coba lagi</button></>}
              </div>}
            </div>
            <div className="preview-tip">
              {photo ? <><ArrowsOutCardinal size={18} aria-hidden="true" /><p id="photo-controls-hint">Geser foto di dalam bingkai untuk menyesuaikan posisi.<span className="visually-hidden"> Pilih pratinjau dan gunakan tombol panah untuk menggeser foto dengan keyboard.</span></p></> : <><ImageSquare size={18} aria-hidden="true" /><p id="preview-hint">Fotomu akan tampil di dalam bingkai ini.</p></>}
            </div>
          </div>
          <p className="privacy-note"><ShieldCheck size={17} aria-hidden="true" />Foto diproses di perangkatmu dan tidak diunggah ke server.</p>
        </section>
      </main>

      <footer className="site-footer"><span>Gelora Pahlawan 2026</span><span>Titian Kuranji · Ulak Patian</span></footer>
    </div>
  )
}
