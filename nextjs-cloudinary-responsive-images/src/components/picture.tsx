import breakpointsData from "../data/cloudinary-breakpoints.json"
import { CloudinaryPicture } from "./cloudinary-picture"

type LegacyBreakpointEntry = number[]

type BreakpointEntry = {
  width: number
  height: number
  breakpoints: number[]
}

type BreakpointManifest = Record<string, LegacyBreakpointEntry | BreakpointEntry>

export interface PictureProps {
  src: string
  alt: string
  width?: number
  height?: number
  sizes?: string
  priority?: boolean
  className?: string
  pictureClassName?: string
}

function toPublicId(src: string): string {
  return src
    .replace(/^\/+/, "")
    .replace(/^public\//, "")
    .replace(/^src\/assets\/images\//, "assets/images/")
    .replace(/\.[^/.]+$/, "")
    .replace(/\/+/g, "/")
}

export function Picture({
  src,
  alt,
  width,
  height,
  sizes = "(min-width: 1200px) 40vw, (min-width: 992px) 60vw, (min-width: 768px) 70vw, 100vw",
  priority = false,
  className,
  pictureClassName,
}: PictureProps) {
  const publicId = toPublicId(src)
  const entry = (breakpointsData as BreakpointManifest)[publicId]

  if (entry === undefined) {
    throw new Error(
      `Cloudinary image "${publicId}" is not in src/data/cloudinary-breakpoints.json. Run the cloudinary:breakpoints command for the source image first.`
    )
  }

  const legacyEntry = Array.isArray(entry)
  const breakpoints = legacyEntry ? entry : entry.breakpoints
  const resolvedWidth = width ?? (legacyEntry ? undefined : entry.width)
  const resolvedHeight = height ?? (legacyEntry ? undefined : entry.height)

  if (resolvedWidth === undefined || resolvedHeight === undefined) {
    throw new Error(
      `Cloudinary image "${publicId}" uses the old JSON format. Keep width and height on this <Picture>, or run cloudinary:breakpoints for the image again to upgrade its JSON entry.`
    )
  }

  return (
    <CloudinaryPicture
      publicId={publicId}
      alt={alt}
      width={resolvedWidth}
      height={resolvedHeight}
      sizes={sizes}
      breakpoints={breakpoints}
      priority={priority}
      className={className}
      pictureClassName={pictureClassName}
    />
  )
}
