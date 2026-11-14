/**
 * Prompt library data access.
 *
 * The manifest (pack metadata) ships eagerly; pack bodies (104 prompts each,
 * 108 files) are code-split via import.meta.glob and fetched on demand when a
 * pack is opened, keeping the initial bundle small.
 */

import manifestJson from "./manifest.json";

export interface PromptLibraryPackMeta {
  slug: string;
  categorySlug: string;
  title: string;
  description: string;
  tags: string[];
  promptCount: number;
}

export interface PromptLibraryCategory {
  slug: string;
  name: string;
  icon: string;
  blurb: string;
  packs: PromptLibraryPackMeta[];
}

export interface PromptLibraryManifest {
  version: number;
  generated: string;
  totals: { categories: number; packs: number; prompts: number };
  categories: PromptLibraryCategory[];
}

export interface PromptPack {
  slug: string;
  categorySlug: string;
  category: string;
  title: string;
  description: string;
  tags: string[];
  prompts: { id: string; text: string }[];
}

export const PROMPT_LIBRARY_MANIFEST =
  manifestJson as unknown as PromptLibraryManifest;

/** Every category in fixed order, with its packs. */
export const PROMPT_LIBRARY_CATEGORIES: PromptLibraryCategory[] =
  PROMPT_LIBRARY_MANIFEST.categories;

/** Flat list of all pack metadata (108 entries). */
export const PROMPT_LIBRARY_PACKS: PromptLibraryPackMeta[] =
  PROMPT_LIBRARY_CATEGORIES.flatMap((c) => c.packs);

const packLoaders = import.meta.glob("./packs/*.json") as Record<
  string,
  () => Promise<{ default: unknown }>
>;

/** Lazily import one pack body by slug; null if the slug is unknown. */
export async function loadPromptPack(slug: string): Promise<PromptPack | null> {
  const loader = packLoaders[`./packs/${slug}.json`];
  if (!loader) return null;
  const mod = await loader();
  return mod.default as PromptPack;
}

export const PROMPT_LIBRARY_TOTALS = PROMPT_LIBRARY_MANIFEST.totals;
