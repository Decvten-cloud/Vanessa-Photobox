import { useEffect, useRef, useState } from 'react'
import './App.css'
import countdownSound from './soundeffect/5 second countdown with sound effect - RG SACHIN.mp3'
import shutterSound from './soundeffect/camera click soundeffect.wav'
import { templateOptions } from './config/stripTemplates'

type Step =
  | 'landing'
  | 'permission'
  | 'template'
  | 'countdown'
  | 'capture'
  | 'confirm'
  | 'review'

type Photo = {
  id: number
  src: string
  label: string
}

type Sticker = {
  id: string
  symbol: string
  x: number
  y: number
  scale?: number
}

const frameColors = [
  { name: 'White', value: '#ffffff' },
  { name: 'Black', value: '#171923' },
  { name: 'Charcoal', value: '#454854' },
  { name: 'Navy', value: '#1f315d' },
  { name: 'Blue', value: '#4f86c6' },
  { name: 'Mint', value: '#a8d8c8' },
  { name: 'Green', value: '#6fa878' },
  { name: 'Yellow', value: '#f4d35e' },
  { name: 'Orange', value: '#ed9b5a' },
  { name: 'Red', value: '#d95d63' },
  { name: 'Purple', value: '#8c73b5' },
  { name: 'Blush', value: '#f4b6cc' },
  { name: 'Rose', value: '#df7fa8' },
  { name: 'Lavender', value: '#d4c5ed' },
  { name: 'Powder blue', value: '#b9dff0' },
  { name: 'Sky blue', value: '#8fc8e5' },
  { name: 'Night blue', value: '#293b5f' },
]

const stickerOptions = ['✦', '♡', '☀', '✿', '✧', 'V']

const cameraIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 7.5h3l1.4-2h3.2l1.4 2H16a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3Z" />
    <circle cx="10" cy="13.5" r="3.2" />
    <path d="M16 11h.01" />
  </svg>
)

function App() {
  const [step, setStep] = useState<Step>('landing')
  const [templateCount, setTemplateCount] = useState(4)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [currentShot, setCurrentShot] = useState(0)
  const [countdown, setCountdown] = useState(5)
  const [flashActive, setFlashActive] = useState(false)
  const [retakeIndex, setRetakeIndex] = useState<number | null>(null)
  const [pendingPhoto, setPendingPhoto] = useState<Photo | null>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [frameColor, setFrameColor] = useState(frameColors[0].value)
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    templateOptions[0]?.id ?? '',
  )
  const [stickers, setStickers] = useState<Sticker[]>([])
  const [error, setError] = useState('')

  const lastTapRef = useRef<Record<string, number>>({})
  const dragOriginRef = useRef<
    Record<
      string,
      {
        pointerId: number
        startX: number
        startY: number
        stickerX: number
        stickerY: number
        moved: boolean
      }
    >
  >({})
  const stickerGestureRef = useRef<
    Map<
      string,
      {
        points: Map<number, { x: number; y: number }>
        baseDistance: number
        baseScale: number
      }
    >
  >(new Map())

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const uploadRef = useRef<HTMLInputElement>(null)
  const templateSliderRef = useRef<HTMLDivElement>(null)
  const countdownAudioRef = useRef<HTMLAudioElement | null>(null)
  const shutterAudioRef = useRef<HTMLAudioElement | null>(null)

  const findCameraDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return

    const devices = await navigator.mediaDevices.enumerateDevices()
    const cameras = devices.filter((device) => device.kind === 'videoinput')

    setCameraDevices(cameras)
    setSelectedDeviceId((current) => {
      const currentDeviceIsAvailable = cameras.some(
        (camera) => camera.deviceId === current,
      )

      return current && currentDeviceIsAvailable
        ? current
        : cameras[0]?.deviceId ?? ''
    })
  }

  useEffect(() => {
    navigator.mediaDevices?.addEventListener('devicechange', findCameraDevices)

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      navigator.mediaDevices?.removeEventListener('devicechange', findCameraDevices)
    }
  }, [])

  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [cameraOn, step])

  useEffect(() => {
    countdownAudioRef.current = new Audio(countdownSound)
    shutterAudioRef.current = new Audio(shutterSound)
    countdownAudioRef.current.preload = 'auto'
    shutterAudioRef.current.preload = 'auto'

    return () => {
      countdownAudioRef.current?.pause()
      shutterAudioRef.current?.pause()
    }
  }, [])

  const playSound = (audioRef: React.RefObject<HTMLAudioElement | null>) => {
    const audio = audioRef.current
    if (!audio) return

    audio.currentTime = 0
    void audio.play().catch(() => {
      // Browsers can reject audio if the user has not interacted with the page yet.
    })
  }

  const startCamera = async (deviceId = selectedDeviceId) => {
    setError('')

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access is not supported in this browser.')
      return false
    }

    try {
      streamRef.current?.getTracks().forEach((track) => track.stop())

      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId
          ? {
              deviceId: { exact: deviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }
          : {
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      setCameraOn(true)
      await findCameraDevices()
      return true
    } catch {
      setError('Camera access was blocked. Please allow camera access to continue.')
      return false
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraOn(false)
  }

  const beginPhotobox = () => {
    setError('')
    setStep('permission')
  }

  const allowCamera = async () => {
    if (await startCamera()) {
      setStep('template')
    }
  }

  const chooseTemplate = (count: number) => {
    setTemplateCount(count)
    setPhotos([])
    setCurrentShot(0)
    setRetakeIndex(null)
    setPendingPhoto(null)
    setCountdown(5)
    setStep('capture')
  }

  const beginCapture = () => {
    setError('')
    setCountdown(5)
    setStep('countdown')
  }

  const replacePhotoAtIndex = (index: number, replacement: Photo) => {
    setPhotos((current) => {
      if (index < 0 || index >= current.length) return current

      const updated = [...current]
      updated[index] = replacement
      return updated
    })
  }

  const captureFromCamera = () => {
    const video = videoRef.current

    if (!video || video.readyState < 2 || !video.videoWidth) {
      return null
    }

    const sourceWidth = video.videoWidth
    const sourceHeight = video.videoHeight
    const isPortrait = sourceHeight > sourceWidth
    const cropSize = Math.min(sourceWidth, sourceHeight)
    const offsetX = isPortrait ? (sourceWidth - cropSize) / 2 : 0
    const offsetY = isPortrait ? (sourceHeight - cropSize) / 2 : 0

    const canvas = document.createElement('canvas')
    canvas.width = isPortrait ? cropSize : sourceWidth
    canvas.height = isPortrait ? cropSize : sourceHeight
    const context = canvas.getContext('2d')

    if (!context) return null

    context.translate(canvas.width, 0)
    context.scale(-1, 1)

    if (isPortrait) {
      context.drawImage(
        video,
        offsetX,
        offsetY,
        cropSize,
        cropSize,
        0,
        0,
        canvas.width,
        canvas.height,
      )
    } else {
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
    }

    return canvas.toDataURL('image/jpeg', 0.92)
  }

  useEffect(() => {
    if (step !== 'countdown') return

    if (countdown === 5) {
      playSound(countdownAudioRef)
    }

    if (countdown > 0) {
      const timer = window.setTimeout(
        () => setCountdown((value) => value - 1),
        900,
      )

      return () => window.clearTimeout(timer)
    }

    const timer = window.setTimeout(() => {
      const captured = captureFromCamera()

      if (!captured) {
        setError('The camera preview is not ready yet. Please try again.')
        setStep('capture')
        return
      }

      const photo: Photo = {
        id: Date.now(),
        src: captured,
        label: `Photo ${currentShot + 1}`,
      }

      setFlashActive(true)
      window.setTimeout(() => setFlashActive(false), 220)
      playSound(shutterAudioRef)
      setPendingPhoto(photo)
      setStep('confirm')
    }, 0)

    return () => window.clearTimeout(timer)
  }, [countdown, currentShot, retakeIndex, step, templateCount])

  const acceptPendingPhoto = () => {
    if (!pendingPhoto) return

    if (retakeIndex !== null) {
      replacePhotoAtIndex(retakeIndex, pendingPhoto)
      setRetakeIndex(null)
      setPendingPhoto(null)
      setStep('review')
      return
    }

    setPhotos((current) => [...current, pendingPhoto])
    setPendingPhoto(null)

    if (currentShot + 1 >= templateCount) {
      setStep('review')
    } else {
      setCurrentShot((shot) => shot + 1)
      setCountdown(5)
      setStep('countdown')
    }
  }

  const rejectPendingPhoto = () => {
    setPendingPhoto(null)
    setCountdown(5)
    setStep('countdown')
  }

  const startRetake = (index: number) => {
    if (pendingPhoto) return

    setRetakeIndex(index)
    setPendingPhoto(null)
    setCurrentShot(index)
    setCountdown(5)
    setStep('countdown')
  }

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file || !file.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = () => {
      const photo: Photo = {
        id: Date.now(),
        src: String(reader.result),
        label:
          retakeIndex !== null
            ? `Photo ${retakeIndex + 1}`
            : 'Uploaded photo',
      }

      if (retakeIndex !== null) {
        replacePhotoAtIndex(retakeIndex, photo)
        setRetakeIndex(null)
      } else {
        setPhotos((current) =>
          current.length < templateCount ? [...current, photo] : current,
        )
      }
      setStep('review')
    }

    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error(`Unable to load image: ${src}`))
      image.src = src
    })

  const downloadStrip = async () => {
    if (!photos.length) return

    const canvas = document.createElement('canvas')
    const width = 360
    const padding = 16
    const gap = 12
    const titleFontSize = Math.max(16, width * 0.07)
    const titleAreaHeight = Math.round(titleFontSize * 1.8)
    const photoWidth = width - padding * 2


    const loadedPhotos = await Promise.all(
      photos.map((photo) => loadImage(photo.src).catch(() => null)),
    )
    const photoHeights = loadedPhotos.map((image) =>
      image ? photoWidth / (image.width / image.height) : photoWidth,
    )
    const totalPhotoHeight = photoHeights.reduce((sum, height) => sum + height, 0)

    canvas.width = width
    canvas.height = Math.round(
      padding * 2 + titleAreaHeight + totalPhotoHeight + gap * (photos.length - 1),
    )

    const context = canvas.getContext('2d')
    if (!context) return

    const drawCenteredBackground = (
      image: HTMLImageElement,
      alpha: number,
      zoomRatio = 1,
    ) => {
      // Cover-fit the image onto the canvas without distorting its aspect
      // ratio -- this mirrors the CSS `background-size: cover` used for the
      // same artwork in the live preview (.strip-template / .strip-overlay).
      // A single uniform scale factor is used for both axes, so the image
      // is only ever cropped (overflow hidden), never stretched.
      const coverScale = Math.max(
        canvas.width / image.width,
        canvas.height / image.height,
      )
      // zoomRatio < 1 zooms in a bit further -- used to show less of the
      // artwork on shorter strips -- without breaking the aspect ratio.
      const scale = coverScale / zoomRatio
      const drawWidth = image.width * scale
      const drawHeight = image.height * scale

      context.save()
      context.globalAlpha = alpha
      context.drawImage(
        image,
        (canvas.width - drawWidth) / 2,
        (canvas.height - drawHeight) / 2,
        drawWidth,
        drawHeight,
      )
      context.restore()
    }

    context.fillStyle = frameColor
    context.fillRect(0, 0, canvas.width, canvas.height)

    const selectedTemplate = templateOptions.find(
      (template) => template.id === selectedTemplateId,
    )

    if (selectedTemplate) {
      const backgroundImage = await loadImage(selectedTemplate.image).catch(() => null)

      if (backgroundImage) {
        drawCenteredBackground(
          backgroundImage,
          0.9,
          photos.length <= 3 ? 0.82 : 1,
        )
      }
    }

    let cursorY = padding
    for (const [index, image] of loadedPhotos.entries()) {
      if (!image) continue

      const slotHeight = photoHeights[index]
      const scale = Math.max(
        photoWidth / image.width,
        slotHeight / image.height,
      )
      const imageWidth = image.width * scale
      const imageHeight = image.height * scale

      context.save()
      context.beginPath()
      context.rect(padding, cursorY, photoWidth, slotHeight)
      context.clip()
      context.drawImage(
        image,
        padding + (photoWidth - imageWidth) / 2,
        cursorY + (slotHeight - imageHeight) / 2,
        imageWidth,
        imageHeight,
      )
      context.restore()

      cursorY += slotHeight + gap
    }

    context.fillStyle = '#29344f'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    const titleFont = `600 italic ${titleFontSize}px "Playfair Display", Georgia, serif`

    // Canvas text doesn't wait for web fonts the way normal page text does --
    // without this, fillText can silently fall back to a generic serif if
    // this exact weight/style hasn't finished loading at the moment the
    // button is clicked, which is what produced the wrong-looking font.
    try {
      await document.fonts.load(titleFont)
    } catch {
      // If the Font Loading API isn't available, fall back to whatever the
      // browser substitutes rather than failing the whole export.
    }

    context.font = titleFont
    // Centered within the reserved band below the photos, instead of a
    // hardcoded distance from the bottom edge that didn't account for how
    // tall that band actually is -- that mismatch is what made the text
    // overlap the last photo.
    context.fillText(
      "VANESSA'S PHOTOBOX",
      width / 2,
      canvas.height - titleAreaHeight / 2,
    )
    context.textBaseline = 'alphabetic'
    context.font = '32px Arial'

    stickers.forEach((sticker) => {
      context.fillText(
        sticker.symbol,
        (sticker.x / 100) * width,
        (sticker.y / 100) * canvas.height,
      )
    })

    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = 'vanessas-photobox-strip.png'
    link.click()
  }

  const toggleSticker = (symbol: string) => {
    setStickers((current) => {
      const existingSticker = current.find((sticker) => sticker.symbol === symbol)

      if (existingSticker) {
        return current.filter((sticker) => sticker.id !== existingSticker.id)
      }

      const offset = current.length * 12
      return [
        ...current,
        {
          id: `${symbol}-${Date.now()}`,
          symbol,
          x: 12 + offset,
          y: 94,
          scale: 1,
        },
      ]
    })
  }

  const removeSticker = (id: string) => {
    setStickers((current) => current.filter((sticker) => sticker.id !== id))
  }

  const moveSticker = (event: React.PointerEvent<HTMLButtonElement>, id: string) => {
    const strip = event.currentTarget.closest('.strip-preview')
    if (!strip || event.buttons !== 1) return

    const origin = dragOriginRef.current[id]
    if (!origin || origin.pointerId !== event.pointerId) return

    const bounds = strip.getBoundingClientRect()
    const deltaX = ((event.clientX - origin.startX) / bounds.width) * 100
    const deltaY = ((event.clientY - origin.startY) / bounds.height) * 100

    const nextX = Math.max(3, Math.min(97, origin.stickerX + deltaX))
    const nextY = Math.max(3, Math.min(97, origin.stickerY + deltaY))

    if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
      origin.moved = true
    }

    setStickers((current) =>
      current.map((sticker) => (sticker.id === id ? { ...sticker, x: nextX, y: nextY } : sticker)),
    )
  }

  const handleStickerPointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    id: string,
  ) => {
    const currentSticker = stickers.find((sticker) => sticker.id === id)
    const strip = event.currentTarget.closest('.strip-preview')

    if (strip) {
      dragOriginRef.current[id] = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        stickerX: currentSticker?.x ?? 50,
        stickerY: currentSticker?.y ?? 50,
        moved: false,
      }
    }

    const gesture = stickerGestureRef.current.get(id) ?? {
      points: new Map<number, { x: number; y: number }>(),
      baseDistance: 0,
      baseScale: 1,
    }

    gesture.points.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    })

    if (gesture.points.size === 1) {
      gesture.baseScale = currentSticker?.scale ?? 1
    }

    if (gesture.points.size === 2) {
      const [firstPointer, secondPointer] = Array.from(gesture.points.values())
      gesture.baseDistance = Math.hypot(
        secondPointer.x - firstPointer.x,
        secondPointer.y - firstPointer.y,
      )
      gesture.baseScale = stickers.find((sticker) => sticker.id === id)?.scale ?? 1
    }

    stickerGestureRef.current.set(id, gesture)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleStickerPointerMove = (
    event: React.PointerEvent<HTMLButtonElement>,
    id: string,
  ) => {
    const gesture = stickerGestureRef.current.get(id)
    const origin = dragOriginRef.current[id]

    if (origin && origin.pointerId === event.pointerId) {
      moveSticker(event, id)
      return
    }

    if (!gesture) return

    gesture.points.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    })

    if (gesture.points.size >= 2 && gesture.baseDistance > 0) {
      const [firstPointer, secondPointer] = Array.from(gesture.points.values())
      const distance = Math.hypot(
        secondPointer.x - firstPointer.x,
        secondPointer.y - firstPointer.y,
      )
      const nextScale = Math.min(
        2,
        Math.max(0.5, gesture.baseScale * (distance / gesture.baseDistance)),
      )

      setStickers((current) =>
        current.map((sticker) =>
          sticker.id === id ? { ...sticker, scale: nextScale } : sticker,
        ),
      )
      return
    }
  }

  const handleStickerPointerUp = (
    event: React.PointerEvent<HTMLButtonElement>,
    id: string,
  ) => {
    const now = Date.now()
    const previousTap = lastTapRef.current[id] ?? 0
    const origin = dragOriginRef.current[id]
    const wasMoved = origin?.moved ?? false

    if (event.pointerType === 'touch' && !wasMoved && now - previousTap < 320) {
      removeSticker(id)
      delete lastTapRef.current[id]
    } else if (event.pointerType === 'touch' && !wasMoved) {
      lastTapRef.current[id] = now
    }

    delete dragOriginRef.current[id]
    stickerGestureRef.current.delete(id)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const scrollTemplates = (direction: number, sliderRef: React.RefObject<HTMLDivElement | null>) => {
    const slider = sliderRef.current
    if (!slider) return

    slider.scrollBy({
      left: direction * slider.clientWidth,
      behavior: 'smooth',
    })
  }

  const templatePages = Array.from(
    { length: Math.ceil(templateOptions.length / 9) },
    (_, pageIndex) => templateOptions.slice(pageIndex * 9, pageIndex * 9 + 9),
  )

  const reset = () => {
    stopCamera()
    setPhotos([])
    setStep('landing')
  }

  const renderHeader = () => (
    <header className="topbar">
      <button className="brand" onClick={reset}>
        <span className="brand-mark">◒</span>
        <span>Vanessa's photobox</span>
      </button>
      <span className="status">
        <i /> your very own private photo studio for yo
      </span>
    </header>
  )

  const renderLanding = () => (
    <section className="flow-screen landing-screen">
      <p className="eyebrow">WELCOME TO</p>
      <h1>
        Vanessa's
        <br />
        <em>photobox.</em>
      </h1>
      <p className="intro-copy">
        A little studio for your biggest smiles.
        <br />
        Take a moment, make it yours.
      </p>
      <button className="primary-button start-button" onClick={beginPhotobox}>
        Start photobox <span>→</span>
      </button>
      <div className="landing-doodle">✦ &nbsp; ♡ &nbsp; ✦</div>
    </section>
  )

  const renderPermission = () => (
    <section className="flow-screen permission-screen">
      <span className="step-label">STEP 1 / 3</span>
      <div className="flow-icon">{cameraIcon}</div>
      <h2>Let's get your camera ready</h2>
      <p>
        Vanessa's photobox needs camera access
        <br />
        to capture your best angles.
      </p>
      <button className="primary-button" onClick={() => void allowCamera()}>
        Allow camera access <span>→</span>
      </button>
      {error && <p className="error-message" role="alert">{error}</p>}
      <button className="text-button" onClick={() => setStep('template')}>
        Continue without camera
      </button>
    </section>
  )

  const renderTemplateCard = (count: number) => (
    <button
      className="template-card"
      key={count}
      onClick={() => chooseTemplate(count)}
    >
      <div className="mini-strip">
        {Array.from({ length: count }).map((_, index) => (
          <i key={index} />
        ))}
      </div>
      <strong>{count} photos</strong>
      <span>
        {count === 4
          ? 'The classic'
          : count === 3
            ? 'Short & sweet'
            : 'Just the two of us'}
      </span>
    </button>
  )

  const renderCapture = () => (
    <div className="capture-layout">
      <div className="capture-main">
      <p className="eyebrow capture-eyebrow">
        PHOTO {currentShot + 1} OF {templateCount}
      </p>
      <h2>
        {step === 'countdown'
          ? 'Get ready...'
          : step === 'confirm'
            ? 'Keep this photo?'
            : 'Camera is ready'}
      </h2>
      <div className="capture-stage">
        {step === 'confirm' && pendingPhoto ? (
          <img className="pending-photo" src={pendingPhoto.src} alt="Newly captured photo" />
        ) : (
          <video
            ref={videoRef}
            className={cameraOn ? 'camera-preview visible' : 'camera-preview'}
            autoPlay
            playsInline
            muted
          />
        )}
        {step === 'countdown' && (
          <div className="count-number">{countdown || '✦'}</div>
        )}
        {step !== 'confirm' && !cameraOn && (
          <div className="empty-stage">
            <span className="big-camera">{cameraIcon}</span>
            <strong>Camera is off</strong>
          </div>
        )}
        {flashActive && <div className="camera-flash" aria-hidden="true" />}
      </div>
      {step === 'confirm' ? (
        <div className="capture-actions confirmation-actions">
          <button className="secondary-button" onClick={rejectPendingPhoto}>
            Retake photo
          </button>
          <button className="primary-button" onClick={acceptPendingPhoto}>
            Use this photo <span>→</span>
          </button>
        </div>
      ) : (
        <div className="capture-actions">
        <button className="secondary-button" onClick={() => void startCamera()}>
          {cameraOn ? 'Use camera again' : 'Turn on camera'}
        </button>
        <button
          className="secondary-button"
          onClick={() => uploadRef.current?.click()}
        >
          Upload instead
        </button>
        </div>
      )}
      {step === 'capture' && (
        <button className="primary-button start-session-button" onClick={beginCapture}>
          Start session <span>→</span>
        </button>
      )}
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        hidden
      />
      {cameraDevices.length > 0 && (
        <select
          className="session-camera-picker"
          value={selectedDeviceId}
          onChange={(event) => {
            setSelectedDeviceId(event.target.value)
            void startCamera(event.target.value)
          }}
          aria-label="Choose camera"
        >
          {cameraDevices.map((device, index) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Camera ${index + 1}`}
            </option>
          ))}
        </select>
      )}
      </div>
      {photos.length > 0 && (
        <aside className="taken-photos" aria-label="Photos already taken">
          <div className="taken-photos-heading">
            <span>Photos taken</span>
            <span>{photos.length} / {templateCount}</span>
          </div>
          <div className="taken-photos-list">
            {photos.map((photo, index) => (
              <button
                className="taken-photo"
                key={photo.id}
                onClick={() => startRetake(index)}
                aria-label={`Retake photo ${index + 1}`}
              >
                <img src={photo.src} alt={photo.label} />
                <span>Retake</span>
              </button>
            ))}
          </div>
        </aside>
      )}
    </div>
  )

  const renderSession = () => (
    <section className="flow-screen session-screen">
      <span className="step-label">STEP 2 / 3</span>
      {step === 'template' && (
        <>
          <h2>Choose your template</h2>
          <p>How many moments belong in your strip?</p>
          <div className="template-grid">
            {[4, 3, 2].map(renderTemplateCard)}
          </div>
        </>
      )}
      {(step === 'countdown' || step === 'capture' || step === 'confirm') &&
        renderCapture()}
    </section>
  )

  const handleDesignToggle = (
    currentId: string,
    selectedId: string,
    setter: React.Dispatch<React.SetStateAction<string>>,
  ) => {
    if (currentId === selectedId) {
      setter('')
      return
    }

    setter(currentId)
  }

  const renderCustomizer = () => (
    <div className="customizer">
      <div className="customizer-group">
        <span>Frame color</span>
        <div className="color-options">
          {frameColors.map((color) => (
            <button
              key={color.value}
              className={
                frameColor === color.value
                  ? 'color-swatch selected'
                  : 'color-swatch'
              }
              style={{ backgroundColor: color.value }}
              onClick={() => setFrameColor(color.value)}
              aria-label={`${color.name} frame`}
            />
          ))}
        </div>
      </div>
      <div className="customizer-group">
        <span>Stickers</span>
        <div className="sticker-options">
          {stickerOptions.map((sticker) => (
            <button
              key={sticker}
              className={
                stickers.some((item) => item.symbol === sticker)
                  ? 'sticker-button selected'
                  : 'sticker-button'
              }
              onClick={() => toggleSticker(sticker)}
              aria-label={`Add ${sticker} sticker`}
            >
              {sticker}
            </button>
          ))}
        </div>
      </div>
      <div className="customizer-group">
        <span>Template</span>
        <div className="template-slider">
          <button
            className="template-slider-arrow"
            type="button"
            onClick={() => scrollTemplates(-1, templateSliderRef)}
            aria-label="Previous template"
          >
            ‹
          </button>
          <div className="template-options" ref={templateSliderRef}>
            {templatePages.map((page, pageIndex) => (
              <div className="template-page" key={`template-page-${pageIndex}`}>
                {page.map((template) => (
                  <button
                    key={template.id}
                    className={
                      selectedTemplateId === template.id
                        ? 'template-swatch selected'
                        : 'template-swatch'
                    }
                    style={{ backgroundImage: `url("${template.image}")` }}
                    onClick={() => handleDesignToggle(template.id, selectedTemplateId, setSelectedTemplateId)}
                    aria-label={template.name}
                  >
                    <span>{template.name}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
          <button
            className="template-slider-arrow"
            type="button"
            onClick={() => scrollTemplates(1, templateSliderRef)}
            aria-label="Next template"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  )

  const renderReview = () => (
    <section className="flow-screen review-screen">
      <span className="step-label">STEP 3 / 3</span>
      <h2>Your strip is looking good!</h2>
      <p>Retake a frame or make your final customizations.</p>
      <div className="review-layout">
        <div
          className="strip-preview"
          style={{
            backgroundColor: frameColor,
          }}
        >
          {selectedTemplateId && (
            <div
              className="strip-template"
              style={{
                backgroundImage: `url("${templateOptions.find((template) => template.id === selectedTemplateId)?.image}")`,
              }}
            />
          )}
          {photos.map((photo, index) => (
            <button
              className="strip-photo"
              key={photo.id}
              onClick={() => startRetake(index)}
            >
              <img src={photo.src} alt={photo.label} />
              <span>Retake</span>
            </button>
          ))}
          <div className="sticker-layer" aria-label="Draggable stickers">
            {stickers.map((sticker) => (
              <button
                className="strip-sticker"
                key={sticker.id}
                style={{
                  left: `${sticker.x}%`,
                  top: `${sticker.y}%`,
                  transform: `translate(-50%, -50%) scale(${sticker.scale ?? 1})`,
                }}
                onPointerDown={(event) => handleStickerPointerDown(event, sticker.id)}
                onPointerMove={(event) => handleStickerPointerMove(event, sticker.id)}
                onPointerUp={(event) => handleStickerPointerUp(event, sticker.id)}
                onPointerLeave={(event) => handleStickerPointerUp(event, sticker.id)}
                onDoubleClick={() => removeSticker(sticker.id)}
                aria-label={`Move ${sticker.symbol} sticker`}
              >
                {sticker.symbol}
              </button>
            ))}
          </div>
          <div className="strip-signature">
            <b>VANESSA'S PHOTOBOX</b>
          </div>
        </div>
        {renderCustomizer()}
      </div>
      <div className="review-actions">
        <button className="primary-button" onClick={() => void downloadStrip()}>
          Download PNG <span></span>
        </button>
        <button className="text-button" onClick={reset}>
          Start over
        </button>
      </div>
    </section>
  )

  return (
    <main className="app-shell">
      {renderHeader()}
      {step === 'landing' && renderLanding()}
      {step === 'permission' && renderPermission()}
      {(step === 'template' ||
        step === 'countdown' ||
        step === 'capture' ||
        step === 'confirm') &&
        renderSession()}
      {step === 'review' && renderReview()}
      <footer>
        <span>✦</span> Vanessa's photobox · made for the moments worth keeping{' '}
        <span>✦</span>
      </footer>
    </main>
  )
}

export default App
