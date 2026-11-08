import { type MDXComponents } from "mdx/types"

import { Picture } from "./src/components/picture"

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    Picture,
    ...components,
  }
}
