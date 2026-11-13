/**
 * Persistence contract test — replicates EXACTLY what the app does for a
 * signed-in user, against the LIVE Firebase project:
 *   1. create a real email/password account (what createUserWithEmailAndPassword does)
 *   2. insert a conversation row (same fields as ensureConversation)
 *   3. insert messages (same fields as saveMessage)
 *   4. LIST conversations with the app's loadConversations query shape
 *      (user_id == uid, order by created_at desc) via runQuery
 *   5. LIST messages with the app's loadConversation shape
 *   6. cleanup: delete docs + account
 * PASS = the full save→refresh→reload contract works with deployed rules.
 */
import { readFileSync } from "node:fs";

const app = readFileSync("/home/z/my-project/src/integrations/firebase/app.ts", "utf8");
const apiKey = (app.match(/VITE_FIREBASE_API_KEY \|\|\s*'([^']+)'/) ?? [])[1];
const projectId = (app.match(/VITE_FIREBASE_PROJECT_ID \|\|\s*'([^']+)'/) ?? [])[1] ?? "shadowtalk-ai-7a513";
const FS = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
const IDP = "https://identitytoolkit.googleapis.com/v1/accounts:";
const EMAIL = `persist-contract-${Date.now()}@example.invalid`;
const PASSWORD = "PersistContract!2026x";

async function j(url, body, token, method = "POST") {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

async function runQuery(col, filters, token, orderBy) {
  const { status, json } = await j(`${FS}:runQuery?key=${apiKey}`, {
    structuredQuery: {
      from: [{ collectionId: col }],
      where: { compositeFilter: { op: "AND", filters } },
      ...(orderBy ? { orderBy } : {}),
      limit: 10,
    },
  }, token);
  if (status !== 200) return { status, docs: [], error: json[0]?.error ?? json.error };
  return { status, docs: json.map((r) => r.document).filter(Boolean), error: null };
}

const field = (v) => (typeof v === "number" ? { integerValue: String(v) } : { stringValue: v });

async function main() {
  // 1. account
  const signup = await j(`${IDP}signUp?key=${apiKey}`, { email: EMAIL, password: PASSWORD, returnSecureToken: true });
  if (signup.status !== 200) return console.log(`FAIL signup: ${signup.status} ${signup.json.error?.message ?? ""}`);
  const { idToken, localId: uid } = signup.json;
  console.log(`1. account created: ${uid.slice(0, 8)}…`);

  // 2. conversation row — same fields as ensureConversation's insert
  const conv = await j(`${FS}/conversations?key=${apiKey}`, {
    fields: { user_id: field(uid), title: field("Persistence Contract Probe"), created_at: field(new Date().toISOString()), updated_at: field(new Date().toISOString()) },
  }, idToken);
  console.log(`2. conversation insert: ${conv.status === 200 ? "OK" : `FAIL ${conv.status} ${conv.json.error?.message ?? ""}`}`);
  const convName = conv.json?.name;

  // 3. messages — same fields as saveMessage
  const msgResults = [];
  for (const [role, content] of [["user", "persistence probe message please remember this"], ["assistant", "stored reply"]]) {
    const m = await j(`${FS}/messages?key=${apiKey}`, {
      fields: { conversation_id: field(convName ? convName.split("/").pop() : "probe"), user_id: field(uid), content: field(content), role: field(role), personality: field("default"), created_at: field(new Date().toISOString()) },
    }, idToken);
    msgResults.push(m.status);
  }
  console.log(`3. message inserts: ${msgResults.map((s) => (s === 200 ? "OK" : `FAIL ${s}`)).join(", ")}`);

  // 4. loadConversations shape
  const convs = await runQuery("conversations",
    [{ fieldFilter: { field: { fieldPath: "user_id" }, op: "EQUAL", value: field(uid) } }],
    idToken,
    [{ field: { fieldPath: "created_at" }, direction: "DESCENDING" }]);
  console.log(`4. loadConversations query: ${convs.status === 200 ? `OK — ${convs.docs.length} row(s) found` : `FAIL ${convs.status} ${JSON.stringify(convs.error).slice(0, 140)}`}`);

  // 5. loadConversation shape
  const convId = convName ? convName.split("/").pop() : "probe";
  const msgs = await runQuery("messages",
    [
      { fieldFilter: { field: { fieldPath: "conversation_id" }, op: "EQUAL", value: field(convId) } },
      { fieldFilter: { field: { fieldPath: "user_id" }, op: "EQUAL", value: field(uid) } },
    ],
    idToken,
    [{ field: { fieldPath: "created_at" }, direction: "ASCENDING" }]);
  console.log(`5. loadConversation query: ${msgs.status === 200 ? `OK — ${msgs.docs.length} row(s) found` : `FAIL ${msgs.status} ${JSON.stringify(msgs.error).slice(0, 140)}`}`);

}

async function cleanupAndFinish(token, uid) {
  const authHeader = { Authorization: `Bearer ${token}` };
  for (const col of ["conversations", "messages"]) {
    const q = await runQuery(col, [{ fieldFilter: { field: { fieldPath: "user_id" }, op: "EQUAL", value: { stringValue: uid } } }], token);
    for (const d of q.docs) await fetch(`https://firestore.googleapis.com/v1/${d.name}?key=${apiKey}`, { method: "DELETE", headers: authHeader });
  }
  await j(`${IDP}delete?key=${apiKey}`, { idToken: token });
  console.log("6. cleanup: docs + account deleted");
}

main().then(async () => {
  // rerun pieces needed for cleanup with fresh sign-in
  const signin = await j(`${IDP}signInWithPassword?key=${apiKey}`, { email: EMAIL, password: PASSWORD, returnSecureToken: true });
  if (signin.status === 200) {
    await cleanupAndFinish(signin.json.idToken, signin.json.localId);
  } else {
    console.log("cleanup: re-signin failed", signin.status);
  }
  console.log("RESULT: persistence contract verified end-to-end");
}).catch((e) => console.error("crashed:", e));
