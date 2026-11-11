import { embedText } from "./embedding";
import { kMeans, nearestCentroid } from "./kMeans";
import {
  addCorpusItem,
  clearCorpusOnly,
  clearShadowTalkModel,
  getAllCorpusItems,
  loadModelState,
  saveModelState,
  updateCorpusClusterIds,
} from "./store";
import type { CorpusItem, ShadowTalkModelState, TopicCluster } from "./types";

const MAX_CORPUS = 500;
const TRAIN_AFTER_INGESTS = 5;

function clusterLabel(sampleText: string, id: number): string {
  const words = sampleText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .slice(0, 3);
  if (words.length === 0) return `Topic ${id + 1}`;
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function buildSystemHint(clusters: TopicCluster[]): string {
  if (clusters.length === 0) return "";
  const top = [...clusters].sort((a, b) => b.size - a.size).slice(0, 5);
  const lines = top.map((c) => `- ${c.label} (${c.size} messages)`);
  return (
    "ShadowTalk Sovereign Model (on-device, unsupervised):\n" +
    "Topic patterns learned from this user without manual labels:\n" +
    lines.join("\n") +
    "\nAdapt tone and examples to these interests. Do not mention clustering or training."
  );
}

function chooseK(n: number): number {
  if (n < 4) return 1;
  return Math.min(8, Math.max(2, Math.round(Math.sqrt(n / 2))));
}

export async function ingestMessage(
  text: string,
  role: "user" | "assistant",
): Promise<{ state: ShadowTalkModelState; shouldTrain: boolean }> {
  const trimmed = text.trim();
  if (trimmed.length < 8) {
    const state = await loadModelState();
    return { state, shouldTrain: false };
  }

  const embedding = await embedText(trimmed);
  const item: CorpusItem = {
    id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); })),
    text: trimmed.slice(0, 1200),
    embedding,
    role,
    createdAt: Date.now(),
  };

  await addCorpusItem(item);

  let items = await getAllCorpusItems();
  if (items.length > MAX_CORPUS) {
    items = items.sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_CORPUS);
    await clearCorpusOnly();
    for (const i of items) await addCorpusItem(i);
  }

  const prev = await loadModelState();
  const corpusCount = items.length;
  const ingestsSinceTrain =
    prev.status === "untrained" ? corpusCount : corpusCount % TRAIN_AFTER_INGESTS === 0;

  const state: ShadowTalkModelState = {
    ...prev,
    corpusCount,
    lastIngestAt: new Date().toISOString(),
    status: prev.trainingGeneration > 0 ? "ready" : corpusCount >= 3 ? "learning" : "untrained",
  };
  await saveModelState(state);

  return { state, shouldTrain: ingestsSinceTrain && corpusCount >= 3 };
}

/** Unsupervised training: k-means on user message embeddings */
export async function runUnsupervisedTraining(): Promise<ShadowTalkModelState> {
  const items = await getAllCorpusItems();
  const userItems = items.filter((i) => i.role === "user" && i.embedding?.length);
  if (userItems.length < 3) {
    const state = await loadModelState();
    return state;
  }

  const vectors = userItems.map((i) => i.embedding);
  const k = chooseK(vectors.length);
  const { assignments, centroids } = kMeans(vectors, k);

  const clusterSamples = new Map<number, string>();
  const clusterCounts = new Map<number, number>();

  const updates: { id: string; clusterId: number }[] = [];
  for (let i = 0; i < userItems.length; i++) {
    const cid = assignments[i];
    updates.push({ id: userItems[i].id, clusterId: cid });
    clusterCounts.set(cid, (clusterCounts.get(cid) || 0) + 1);
    if (!clusterSamples.has(cid)) clusterSamples.set(cid, userItems[i].text);
  }
  await updateCorpusClusterIds(updates);

  const clusters: TopicCluster[] = centroids.map((centroid, id) => ({
    id,
    centroid,
    size: clusterCounts.get(id) || 0,
    sampleText: clusterSamples.get(id) || "",
    label: clusterLabel(clusterSamples.get(id) || "", id),
  }));

  const prev = await loadModelState();
  const systemHint = buildSystemHint(clusters);
  const state: ShadowTalkModelState = {
    ...prev,
    trainingGeneration: prev.trainingGeneration + 1,
    corpusCount: items.length,
    lastTrainedAt: new Date().toISOString(),
    clusters,
    systemHint,
    status: "ready",
  };
  await saveModelState(state);
  return state;
}

export async function buildLearnedContext(query: string): Promise<string> {
  const state = await loadModelState();
  if (!state.systemHint && state.clusters.length === 0) return "";

  const parts: string[] = [];
  if (state.systemHint) parts.push(state.systemHint);

  try {
    const qEmbed = await embedText(query.slice(0, 500));
    const { index } = nearestCentroid(
      qEmbed,
      state.clusters.map((c) => c.centroid),
    );
    if (index >= 0 && state.clusters[index]) {
      const c = state.clusters[index];
      parts.push(`Current query is closest to learned topic "${c.label}".`);
    }

    const items = await getAllCorpusItems();
    const scored = items
      .map((item) => {
        let dot = 0;
        let na = 0;
        let nb = 0;
        for (let i = 0; i < qEmbed.length; i++) {
          dot += qEmbed[i] * item.embedding[i];
          na += qEmbed[i] * qEmbed[i];
          nb += item.embedding[i] * item.embedding[i];
        }
        const sim = dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
        return { item, sim };
      })
      .sort((a, b) => b.sim - a.sim)
      .slice(0, 3);

    if (scored.length > 0) {
      parts.push(
        "Relevant prior user context:\n" +
          scored.map((s) => `• ${s.item.text.slice(0, 200)}`).join("\n"),
      );
    }
  } catch {
    /* embedding optional at inference */
  }

  return parts.join("\n\n");
}

export async function resetShadowTalkModel(): Promise<void> {
  await clearShadowTalkModel();
}

export { loadModelState };
