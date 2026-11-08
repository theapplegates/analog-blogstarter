import { create, insertMultiple, search } from "@orama/orama"

import { type SiteSearchDocument } from "@/lib/search/search-data"

const searchSchema = {
  key: "string",
  title: "string",
  description: "string",
  keywords: "string[]",
} as const

const searchableProperties = ["title", "description", "keywords"] as const

type SiteSearchIndex = ReturnType<typeof createSiteSearchIndex>
type IndexedSiteSearchDocument = {
  key: string
  title: string
  description: string
  keywords: string[]
}

/**
 * Builds the in-browser Orama index from the search documents served by the static `/api/search`
 * route.
 */
export function createSiteSearchIndex(documents: SiteSearchDocument[]) {
  const index = create({ schema: searchSchema })
  const inserted = insertMultiple(index, documents.map(toIndexedDocument))

  if (inserted instanceof Promise) {
    throw new Error("Site search uses a synchronous Orama index.")
  }

  return index
}

/** Returns the matching document keys ordered by Orama relevance score. */
export function searchSiteSearchIndex(index: SiteSearchIndex, term: string): string[] {
  const results = search(index, {
    term,
    properties: [...searchableProperties],
    boost: {
      title: 3,
      keywords: 2,
    },
    tolerance: term.trim().length >= 3 ? 1 : 0,
    limit: 50,
  })

  if (results instanceof Promise) {
    throw new Error("Site search uses a synchronous Orama index.")
  }

  return results.hits.map((hit) => hit.document.key)
}

function toIndexedDocument(document: SiteSearchDocument): IndexedSiteSearchDocument {
  return {
    key: document.id,
    title: document.title,
    description: document.description ?? "",
    keywords: document.keywords,
  }
}
