"use client"

import Image from "next/image"
import { useState } from "react"

import breakpointsData from "../data/cloudinary-breakpoints.json"
import { CloudinaryPicture } from "./cloudinary-picture"

type LegacyBreakpointEntry = number[]

type BreakpointEntry = {
  width: number
  height: number
  breakpoints: number[]
}

type BreakpointManifest = Record<string, LegacyBreakpointEntry | BreakpointEntry>

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

function localPathToPublicId(src: string): string | null {
  if (/^(?:https?:)?\/\//.test(src) || /^(?:data|blob):/.test(src)) {
    return null
  }

  if (/\.svg$/i.test(src)) {
    return null
  }

  const clean = src
    .replace(/^\/+/, "")
    .replace(/^public\//, "")
    .replace(/^src\/assets\/images\//, "assets/images/")
    .replace(/\.[^/.]+$/, "")
    .replace(/\/+/g, "/")

  return clean || null
}

export interface PostImageProps {
  src?: string
  alt: string
  width?: number
  height?: number
  placeholder?: string
  sizes?: string
  loading?: "lazy" | "eager"
  priority?: boolean
  unoptimized?: boolean
  hoverScale?: boolean
  className?: string
  pictureClassName?: string
}

export function PostImage({
  src,
  alt,
  width,
  height,
  placeholder,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  loading = "lazy",
  priority = false,
  unoptimized = false,
  hoverScale = false,
  className,
  pictureClassName,
}: PostImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  const [lastSrc, setLastSrc] = useState(src)
  if (lastSrc !== src) {
    setLastSrc(src)
    setLoaded(false)
    setError(false)
  }

  if (src === undefined || src === "") {
    return (
      <div
        className={classes("relative flex h-full w-full items-center justify-center", className)}
      >
        {placeholder ? <span>{placeholder}</span> : null}
      </div>
    )
  }

  const publicId =
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME !== undefined &&
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME !== ""
      ? localPathToPublicId(src)
      : null

  const entry = publicId === null ? undefined : (breakpointsData as BreakpointManifest)[publicId]

  if (publicId !== null && entry !== undefined) {
    const legacyEntry = Array.isArray(entry)
    const breakpoints = legacyEntry ? entry : entry.breakpoints
    const resolvedWidth = width ?? (legacyEntry ? 1600 : entry.width)
    const resolvedHeight = height ?? (legacyEntry ? 900 : entry.height)

    return (
      <CloudinaryPicture
        publicId={publicId}
        alt={alt}
        width={resolvedWidth}
        height={resolvedHeight}
        sizes={sizes}
        breakpoints={breakpoints}
        priority={priority}
        fill
        className={classes(
          "transition-transform duration-300",
          hoverScale && "group-hover:scale-105",
          className
        )}
        pictureClassName={pictureClassName}
      />
    )
  }

  return (
    <>
      {!loaded ? (
        <>
          <div
            className={classes(
              "absolute inset-0 animate-pulse",
              hoverScale && "group-hover:scale-105"
            )}
          />
          {placeholder ? (
            <span className="absolute inset-0 flex items-center justify-center">{placeholder}</span>
          ) : null}
        </>
      ) : null}

      {!error ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          loading={priority ? "eager" : loading}
          priority={priority}
          unoptimized={unoptimized}
          className={classes(
            "object-cover transition-transform duration-300",
            hoverScale && "group-hover:scale-105",
            className
          )}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      ) : null}
    </>
  )
}
