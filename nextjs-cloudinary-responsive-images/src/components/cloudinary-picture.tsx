"use client"

import { getCldImageUrl } from "next-cloudinary"

type CloudinaryFormat = "jxl" | "avif" | "webp"

const FORMAT_ORDER: CloudinaryFormat[] = ["jxl", "avif", "webp"]
const MIME_TYPES: Record<CloudinaryFormat, string> = {
  jxl: "image/jxl",
  avif: "image/avif",
  webp: "image/webp",
}

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export interface CloudinaryPictureProps {
  publicId: string
  alt: string
  width: number
  height: number
  sizes?: string
  breakpoints: number[]
  priority?: boolean
  fill?: boolean
  className?: string
  pictureClassName?: string
}

function buildUrl(publicId: string, format: CloudinaryFormat, width: number): string {
  return getCldImageUrl({
    src: publicId,
    width,
    crop: "limit",
    format,
    quality: "auto",
  })
}

function buildSrcSet(publicId: string, format: CloudinaryFormat, widths: number[]): string {
  return widths
    .map((candidateWidth) => `${buildUrl(publicId, format, candidateWidth)} ${candidateWidth}w`)
    .join(", ")
}

export function CloudinaryPicture({
  publicId,
  alt,
  width,
  height,
  sizes = "100vw",
  breakpoints,
  priority = false,
  fill = false,
  className,
  pictureClassName,
}: CloudinaryPictureProps) {
  const widths = [...new Set(breakpoints)]
    .filter((candidateWidth) => Number.isFinite(candidateWidth) && candidateWidth > 0)
    .sort((a, b) => a - b)

  if (widths.length === 0) {
    throw new Error(`No responsive breakpoints were found for Cloudinary image: ${publicId}`)
  }

  // Use the largest Cloudinary breakpoint as the ordinary <img> fallback.
  // Do not use the original source width here; that can accidentally make the
  // browser download a very large image even though Cloudinary capped the
  // responsive breakpoint set at a smaller size.
  const fallbackWidth = widths[widths.length - 1]
  const fallbackSrc = buildUrl(publicId, "webp", fallbackWidth)

  return (
    <picture
      className={classes(
        "block",
        fill && "relative h-full w-full overflow-hidden",
        pictureClassName
      )}
    >
      {FORMAT_ORDER.map((format) => (
        <source
          key={format}
          type={MIME_TYPES[format]}
          sizes={sizes}
          srcSet={buildSrcSet(publicId, format, widths)}
        />
      ))}
      <img
        src={fallbackSrc}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        className={classes(
          fill ? "absolute inset-0 h-full w-full object-cover" : "h-auto w-full",
          className
        )}
      />
    </picture>
  )
}
