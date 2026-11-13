/* Calibrate the lexical retrieval threshold with real score values. */
import { LocalHashEmbedder, cosineSimilarity } from "/home/z/my-project/src/lib/rag/embeddings.ts";
import { chunkText } from "/home/z/my-project/src/lib/rag/chunker.ts";

const DOC_A = `Project Phoenix storage architecture.

The system uses PostgreSQL 15 as the primary datastore. Connection pooling is
handled by PgBouncer with a pool size of 40. The database runs in WAL mode for
durability and takes nightly snapshots to object storage.

Retrieval of user documents happens through the RAG pipeline. Chunks are
embedded and stored in a local index. Relevance thresholds prevent unrelated
content from reaching the model.

Deployment runs on Kubernetes with three replicas behind a load balancer.
Rolling updates use a surge of one pod. The migration job runs before each
deploy and is gated by a checksum of the schema.`;

const DOC_B = `Grandma's pancake recipe.

Mix two cups of flour with two eggs and one cup of milk. Add a pinch of salt
and a tablespoon of sugar. Fry on medium heat until golden. Serve with maple
syrup and fresh blueberries.`;

const embedder = new LocalHashEmbedder();
const queries = [
  "How is the PostgreSQL connection pool configured?",
  "PostgreSQL pool configuration",
  "how does deployment work, replicas and rolling updates",
  "pancake recipe with maple syrup",
  "What is the best way to bake sourdough bread at home?",
  "who won the football match yesterday",
];

const chunksA = chunkText(DOC_A);
const chunksB = chunkText(DOC_B);
console.log("chunksA:", chunksA.length, "chunksB:", chunksB.length);

for (const q of queries) {
  const [qv] = await embedder.embed([q]);
  const scoresA = chunksA.map((c) => cosineSimilarity(qv, (await embedder.embed([c.text]))[0]));
  const scoresB = chunksB.map((c) => cosineSimilarity(qv, (await embedder.embed([c.text]))[0]));
  const max = Math.max(...scoresA, ...scoresB);
  console.log(`"${q}" → max score: ${max.toFixed(3)} (A:${Math.max(...scoresA).toFixed(3)} B:${Math.max(...scoresB).toFixed(3)})`);
}

// Related-vs-unrelated pair check (embeddings test)
const q1 = (await embedder.embed(["how do I configure the postgres connection pool?"]))[0];
const rel = (await embedder.embed(["configure the postgres connection pool size in the database config"]))[0];
const unr = (await embedder.embed(["delicious pancake recipe with blueberries and maple syrup"]))[0];
console.log("pair related:", cosineSimilarity(q1, rel).toFixed(3), "unrelated:", cosineSimilarity(q1, unr).toFixed(3));
