type TemplateAsset = {
  id: string
  name: string
  image: string
}

const templateFiles = import.meta.glob<string>(
  [
    '../assets/template/*.svg',
    '../assets/template/*.png',
    '../assets/template/*.jpg',
    '../assets/template/*.jpeg',
    '../assets/template/*.webp',
  ],
  {
    eager: true,
    import: 'default',
    query: '?url',
  },
)

const mapDesignFiles = (files: Record<string, string>): TemplateAsset[] =>
  Object.entries(files)
    .map(([filePath, image]) => {
      const fileName =
        filePath.split('/').pop()?.replace(/\.[^.]+$/, '') ?? filePath
      const name = fileName
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase())

      return {
        id: fileName,
        name,
        image,
      }
    })
    .sort((first, second) => {
      const firstNumber = Number(first.id)
      const secondNumber = Number(second.id)

      if (!Number.isNaN(firstNumber) && !Number.isNaN(secondNumber)) {
        return firstNumber - secondNumber
      }

      return first.name.localeCompare(second.name)
    })

export const templateOptions = mapDesignFiles(templateFiles)
