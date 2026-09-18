// Every transparent sticker file living in src/assets/sticker/ is auto-registered
// here. Adding a new PNG/JPG/SVG file to that folder makes it appear in the menu
// without needing a brittle one-off import for each filename.

export type StickerOption = {
  id: string
  type: 'emoji' | 'image'
  symbol?: string
  src?: string
  label: string
}

const stickerAssetEntries = Object.entries(
  import.meta.glob('../assets/sticker/*.{png,jpg,jpeg,svg}', {
    eager: true,
    import: 'default',
  }) as Record<string, string>,
)

const imageStickerOptions: StickerOption[] = stickerAssetEntries.map(([path, src]) => {
  const fileName = path.split('/').pop() ?? path
  const label = fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    id: `sticker-${label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')}`,
    type: 'image',
    src,
    label: label || 'Sticker',
  }
})

export const stickerOptions: StickerOption[] = [
  // Original text/emoji stickers
  { id: 'star', type: 'emoji', symbol: '✦', label: 'Star' },
  { id: 'heart', type: 'emoji', symbol: '♡', label: 'Heart' },
  { id: 'sun', type: 'emoji', symbol: '☀', label: 'Sun' },
  { id: 'flower', type: 'emoji', symbol: '✿', label: 'Flower' },
  { id: 'sparkle', type: 'emoji', symbol: '✧', label: 'Sparkle' },
  { id: 'v', type: 'emoji', symbol: 'V', label: 'V' },
  ...imageStickerOptions,
]