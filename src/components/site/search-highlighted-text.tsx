import { Highlight } from "@orama/highlight"
import { parse as parseEmoji } from "@twemoji/parser"

import { TwemojifyText } from "@/components/ui/my"

type SearchHighlightedTextProps = {
  text: string
  query: string
}

type TextSegment = {
  text: string
  start: number
  highlighted: boolean
}

type TextRange = {
  start: number
  end: number
}

/**
 * Renders text with the search query terms wrapped in `<mark>` while keeping Twemoji rendering
 * intact.
 */
export function SearchHighlightedText({ text, query }: SearchHighlightedTextProps) {
  const segments = splitTextByHighlights(text, query)

  return (
    <>
      {segments.map((segment) =>
        segment.highlighted ? (
          <mark
            key={`${segment.start}:mark`}
            className="rounded-sm bg-primary/20 px-0.5 text-inherit"
          >
            <TwemojifyText text={segment.text} />
          </mark>
        ) : (
          <TwemojifyText key={`${segment.start}:text`} text={segment.text} />
        )
      )}
    </>
  )
}

/** Returns whether the query matches any part of the text. */
export function hasSearchHighlight(text: string, query: string): boolean {
  const term = query.trim()

  if (!term || !text) {
    return false
  }

  const highlighter = new Highlight()
  highlighter.highlight(text, term)

  return highlighter.positions.length > 0
}

/** Returns the short keywords that match the query, without duplicates. */
export function getMatchingKeywords(keywords: string[], query: string): string[] {
  const term = query.trim()

  if (!term) {
    return []
  }

  const highlighter = new Highlight()
  const matches = keywords.filter((keyword) => {
    highlighter.highlight(keyword, term)

    return keyword.length <= 48 && highlighter.positions.length > 0
  })

  return [...new Set(matches)].toSorted((a, b) => a.length - b.length).slice(0, 3)
}

function splitTextByHighlights(text: string, query: string): TextSegment[] {
  const term = query.trim()

  if (!term) {
    return [{ text, start: 0, highlighted: false }]
  }

  const highlighter = new Highlight()
  highlighter.highlight(text, term)

  const highlightRanges = mergeRanges(
    highlighter.positions
      .filter((position) => position.start <= position.end)
      .map((position) => ({ start: position.start, end: position.end + 1 }))
  )

  if (highlightRanges.length === 0) {
    return [{ text, start: 0, highlighted: false }]
  }

  const emojiRanges = parseEmoji(text).map((entity) => ({
    start: entity.indices[0],
    end: entity.indices[1],
  }))

  const safeRanges = highlightRanges.filter(
    (range) => !emojiRanges.some((emojiRange) => rangesOverlap(range, emojiRange))
  )

  if (safeRanges.length === 0) {
    return [{ text, start: 0, highlighted: false }]
  }

  return rangesToSegments(text, safeRanges)
}

function mergeRanges(ranges: TextRange[]): TextRange[] {
  const sortedRanges = ranges.toSorted((a, b) => a.start - b.start)
  const mergedRanges: TextRange[] = []

  for (const range of sortedRanges) {
    const previousRange = mergedRanges.at(-1)

    if (previousRange && range.start <= previousRange.end) {
      previousRange.end = Math.max(previousRange.end, range.end)
    } else {
      mergedRanges.push({ ...range })
    }
  }

  return mergedRanges
}

function rangesOverlap(a: TextRange, b: TextRange): boolean {
  return a.start < b.end && b.start < a.end
}

function rangesToSegments(text: string, ranges: TextRange[]): TextSegment[] {
  const segments: TextSegment[] = []
  let cursor = 0

  for (const range of ranges) {
    if (range.start > cursor) {
      segments.push({ text: text.slice(cursor, range.start), start: cursor, highlighted: false })
    }

    segments.push({
      text: text.slice(range.start, range.end),
      start: range.start,
      highlighted: true,
    })
    cursor = range.end
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), start: cursor, highlighted: false })
  }

  return segments
}
