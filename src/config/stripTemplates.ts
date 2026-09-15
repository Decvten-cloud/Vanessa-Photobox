type TemplateAsset = {
  id: string
  name: string
  image: string
}

const templateFiles = import.meta.glob<string>(
  '../assets/template/*.svg',
  {
    eager: true,
    import: 'default',
    query: '?url',
  },
)

export const stripTemplates: TemplateAsset[] = Object.entries(templateFiles)
  .map(([filePath, image]) => {
    const fileName = filePath.split('/').pop()?.replace('.svg', '') ?? filePath

    return {
      id: fileName,
      name: `Template ${fileName}`,
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
