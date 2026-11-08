# Next.js + Cloudinary responsive images (JXL → AVIF → WebP)

This folder is a portable version of the responsive-image system.

## What it does

1. Put an original image in `src/assets/images/`.
2. Run the Cloudinary breakpoint command once.
3. The script uploads the original to Cloudinary.
4. Cloudinary calculates responsive breakpoint widths.
5. The script stores the image width, height, and breakpoint widths in `src/data/cloudinary-breakpoints.json`.
6. In MDX you use a simple `<Picture>` component.
7. The browser receives a native HTML `<picture>` with JXL first, AVIF second, and WebP third.

Cloudinary creates the requested JXL/AVIF/WebP transformations when those URLs are first requested and then caches the derived assets. The breakpoint upload step does not need to generate every format up front.

## One-time setup on a Next.js site

### 1. Install packages

```bash
npm install next-cloudinary cloudinary
```

### 2. Copy the files

Copy:

- `src/components/cloudinary-picture.tsx`
- `src/components/picture.tsx`
- `src/components/post-image.tsx` (only if the site uses ordinary Markdown/Next Image fallback behavior)
- `scripts/cloudinary-breakpoints.mjs`
- `src/data/cloudinary-breakpoints.json`

### 3. Add environment variables

Copy `.env.local.example` to `.env.local` and fill in your own Cloudinary values.

Never commit the API secret.

### 4. Add the package.json command

Add:

```json
"cloudinary:breakpoints": "node --env-file=.env.local scripts/cloudinary-breakpoints.mjs"
```

### 5. Register `<Picture>` with MDX

If the site uses `@next/mdx`, merge the provided `mdx-components.tsx` example into the site's existing `mdx-components.tsx`.

If the site uses a different MDX system, find the file where custom MDX components are registered and add `Picture` there instead. This is the one integration file that differs from site to site.

## Adding an image

Put the original here:

```text
src/assets/images/my-photo.jpg
```

Run:

```bash
npm run cloudinary:breakpoints -- src/assets/images/my-photo.jpg
```

The script prints something like:

```jsx
<Picture
  src="assets/images/my-photo"
  alt="TODO: describe this image"
  sizes="(min-width: 1200px) 40vw, (min-width: 992px) 60vw, (min-width: 768px) 70vw, 100vw"
/>
```

Paste that into the MDX post and replace the alt text.

You do **not** need to type width or height. They are stored in the JSON manifest automatically.

## The important files

### Files that are the same on almost every Next.js site

1. `src/components/cloudinary-picture.tsx`
   - Builds the JXL, AVIF, and WebP `srcset` values.
   - Outputs the real HTML `<picture>` element.

2. `src/components/picture.tsx`
   - This is the `<Picture>` component used in MDX.
   - Reads the JSON manifest and supplies width, height, and breakpoints automatically.

3. `scripts/cloudinary-breakpoints.mjs`
   - Uploads the source image.
   - Asks Cloudinary for responsive breakpoints.
   - Updates the JSON manifest.

4. `src/data/cloudinary-breakpoints.json`
   - The image registry/manifest.
   - Commit this file to Git.

### Files that usually need a small change on a new site

5. `package.json`
   - Install `next-cloudinary` and `cloudinary`.
   - Add the `cloudinary:breakpoints` command.

6. `.env.local`
   - Add the Cloudinary cloud name, API key, and API secret.
   - Do not commit this file.

7. The site's MDX component registration file
   - Often `mdx-components.tsx` in a standard Next.js + `@next/mdx` site.
   - Add the `Picture` component to the MDX component map.

### Optional

8. `src/components/post-image.tsx`
   - Keep this only when the site already has a reusable image component for cards, thumbnails, Markdown images, etc.
   - It uses Cloudinary when the image is in the JSON manifest and falls back to `next/image` otherwise.

## Why this version is safer than the original

- Width and height are stored in the manifest instead of copied by hand.
- The responsive `srcset` uses only Cloudinary's calculated breakpoint widths.
- The original full image width is no longer accidentally added as an extra huge `srcset` candidate.
- Normal MDX images render at their natural aspect ratio instead of depending on absolute positioning.
- The explicit `<Picture>` component and the lower-level `<CloudinaryPicture>` component have separate jobs.
- Old JSON entries that are only arrays still work when an older post already supplies width and height.

## Mental model

```text
src/assets/images/photo.jpg
          ↓
npm run cloudinary:breakpoints
          ↓
      Cloudinary
          ↓
cloudinary-breakpoints.json
          ↓
       <Picture>
          ↓
    HTML <picture>
   ↙      ↓       ↘
 JXL     AVIF     WebP
```
