import { mkdir, readFile, stat, writeFile } from "node:fs/promises"
import { basename, dirname, extname, relative, resolve } from "node:path"

import { v2 as cloudinary } from "cloudinary"

const DEFAULT_SIZES =
  "(min-width: 1200px) 40vw, (min-width: 992px) 60vw, (min-width: 768px) 70vw, 100vw"

const rawArgs = process.argv.slice(2).filter(Boolean)
const sizesArg = rawArgs.find((arg) => arg.startsWith("--sizes="))
const sizes = sizesArg
  ? sizesArg.slice("--sizes=".length).replace(/^["']|["']$/g, "")
  : DEFAULT_SIZES
const imageRefs = rawArgs.filter((arg) => !arg.startsWith("--"))
const outputPath = resolve("src/data/cloudinary-breakpoints.json")

const cloudName =
  process.env.CLOUDINARY_CLOUD_NAME ||
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  process.env.PUBLIC_CLOUDINARY_CLOUD_NAME
const apiKey = process.env.CLOUDINARY_API_KEY
const apiSecret = process.env.CLOUDINARY_API_SECRET

if (imageRefs.length === 0) {
  console.error(
    'Usage: npm run cloudinary:breakpoints -- [--sizes="<sizes>"] <local_file_or_public_id> [...]'
  )
  process.exit(1)
}

if (!cloudName || !apiKey || !apiSecret) {
  console.error(
    "Missing Cloudinary credentials. Set CLOUDINARY_CLOUD_NAME (or NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME), CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
  )
  process.exit(1)
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
})

const breakpointRequest = {
  create_derived: true,
  bytes_step: Number(process.env.CLOUDINARY_BREAKPOINT_BYTES_STEP || 20000),
  min_width: Number(process.env.CLOUDINARY_BREAKPOINT_MIN_WIDTH || 200),
  max_width: Number(process.env.CLOUDINARY_BREAKPOINT_MAX_WIDTH || 2000),
  max_images: Number(process.env.CLOUDINARY_BREAKPOINT_MAX_IMAGES || 10),
}

async function readExistingManifest() {
  try {
    return JSON.parse(await readFile(outputPath, "utf8"))
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {}
    }
    throw error
  }
}

function getWidths(result) {
  return result.responsive_breakpoints?.[0]?.breakpoints
    ?.map((breakpoint) => breakpoint.width)
    .filter((width) => Number.isFinite(width) && width > 0)
    .sort((a, b) => a - b)
}

async function isLocalFile(imageRef) {
  try {
    return (await stat(resolve(imageRef))).isFile()
  } catch {
    return false
  }
}

function getPublicIdFromPath(imagePath) {
  const absolutePath = resolve(imagePath)
  const relativeToProject = relative(process.cwd(), absolutePath)
  const withoutExtension = relativeToProject.slice(0, -extname(relativeToProject).length)

  if (!withoutExtension.startsWith("..")) {
    return withoutExtension
      .replace(/^src\/assets\/images\//, "assets/images/")
      .replace(/^public\//, "")
  }

  return basename(imagePath, extname(imagePath))
}

const manifest = await readExistingManifest()

for (const imageRef of imageRefs) {
  const localFile = await isLocalFile(imageRef)
  const publicId = localFile ? getPublicIdFromPath(imageRef) : imageRef

  const result = localFile
    ? await cloudinary.uploader.upload(resolve(imageRef), {
        public_id: publicId,
        overwrite: true,
        invalidate: true,
        resource_type: "image",
        responsive_breakpoints: [breakpointRequest],
      })
    : await cloudinary.uploader.explicit(publicId, {
        type: "upload",
        resource_type: "image",
        responsive_breakpoints: [breakpointRequest],
      })

  const widths = getWidths(result)

  if (!widths?.length) {
    throw new Error(`Cloudinary did not return responsive breakpoints for ${imageRef}`)
  }

  if (!Number.isFinite(result.width) || !Number.isFinite(result.height)) {
    throw new Error(`Cloudinary did not return width and height for ${imageRef}`)
  }

  manifest[publicId] = {
    width: result.width,
    height: result.height,
    breakpoints: widths,
  }

  console.log(`\nUploaded: ${imageRef}`)
  console.log(`Cloudinary public ID: ${publicId}`)
  console.log(`Image size: ${result.width} × ${result.height}`)
  console.log(`Breakpoints: ${widths.join(", ")}`)
  console.log(`\nPaste this into your MDX post:\n`)
  console.log(
    `<Picture\n  src="${publicId}"\n  alt="TODO: describe this image"\n  sizes="${sizes}"\n/>`
  )
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`)

console.log(`\nUpdated ${relative(process.cwd(), outputPath)}`)
