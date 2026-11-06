import { backend } from "@/integrations/local/client";

export interface PublishAnswerInput {
  prompt: string;
  answer: string;
  title?: string;
  model?: string;
  source?: "chat" | "strategy";
}

export interface PublishedAnswer {
  slug: string;
  url: string;
  ogImageUrl: string;
}

/**
 * Publish an answer to a public /s/:slug page.
 *
 * Final completion phase: this previously called a `share-answer` Cloud
 * Function that does not exist anywhere in `functions/src/index.ts`, so
 * every publish failed (the chat share dialog silently fell back to a
 * non-shareable link and /s/:slug pages could never be created). The
 * `shared_answers` Firestore collection and its security rules were already
 * designed for direct client writes (public read, owner-scoped create), so
 * publishing now writes there directly — no new backend surface required.
 *
 * Requires a signed-in user (any auth state, including anonymous accounts):
 * the rules require `user_id == auth.uid` on create. Guests without an
 * anonymous identity get an explicit error instead of a silent failure.
 */
const SLUG_ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";

function randomSuffix(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => SLUG_ALPHABET[b % SLUG_ALPHABET.length]).join("");
}

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40)
    .replace(/^-+|-+$/g, "");
}

export async function publishSharedAnswer(input: PublishAnswerInput): Promise<PublishedAnswer> {
  const { data: auth } = await backend.auth.getUser();
  const user = auth?.user;
  if (!user?.id) {
    throw new Error("Sign in to publish a shareable answer link.");
  }

  const baseSlug = slugifyTitle(input.title || "") || "answer";

  // Collision check against existing public slugs, with a high-entropy
  // fallback suffix if all retries collide (practically never).
  let slug = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `${baseSlug}-${randomSuffix(8)}`;
    const { data: existing } = await backend
      .from("shared_answers")
      .select("id")
      .eq("slug", candidate)
      .limit(1)
      .maybeSingle();
    if (!existing) {
      slug = candidate;
      break;
    }
  }
  if (!slug) slug = `${baseSlug}-${randomSuffix(16)}`;

  const { error } = await backend
    .from("shared_answers")
    .insert({
      slug,
      user_id: user.id,
      title: input.title ?? null,
      prompt: input.prompt,
      answer: input.answer,
      model: input.model ?? null,
      source: input.source ?? "chat",
      views: 0,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const base = typeof window !== "undefined" ? window.location.origin : "https://shadowtalk-ai.com";
  return {
    slug,
    url: `${base}/s/${slug}?utm_source=shared_answer&utm_medium=viral`,
    ogImageUrl: "",
  };
}
