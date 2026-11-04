import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
const rulesDescribe = emulatorHost ? describe : describe.skip;
let testEnv: RulesTestEnvironment;

rulesDescribe("Firestore auth and profile rules", () => {
  beforeAll(async () => {
    const [host, port] = emulatorHost!.split(":");
    testEnv = await initializeTestEnvironment({
      projectId: "demo-shadowtalk-auth-rules",
      firestore: {
        host,
        port: Number(port),
        rules: readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8"),
      },
    });
  });

  beforeEach(async () => testEnv.clearFirestore());
  afterAll(async () => testEnv?.cleanup());

  it("allows a user to read their private profile but denies another user's profile", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "profiles/bob"), { id: "bob", email: "bob@example.test", plan: "free" });
    });
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    await assertFails(getDoc(doc(aliceDb, "profiles/bob")));
    await assertSucceeds(getDoc(doc(bobDb, "profiles/bob")));
    await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "profiles/bob")));
  });

  it("exposes only explicitly allowed fields in public profiles", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(setDoc(doc(aliceDb, "public_profiles/alice"), {
      user_id: "alice", display_name: "Alice", updated_at: serverTimestamp(),
    }));
    await assertSucceeds(getDoc(doc(testEnv.unauthenticatedContext().firestore(), "public_profiles/alice")));
    await assertFails(setDoc(doc(aliceDb, "public_profiles/alice"), {
      user_id: "alice", display_name: "Alice", email: "alice@example.test", updated_at: serverTimestamp(),
    }));
    await assertFails(setDoc(doc(testEnv.authenticatedContext("bob").firestore(), "public_profiles/alice"), {
      user_id: "alice", display_name: "Changed by Bob", updated_at: serverTimestamp(),
    }));
  });

  it("denies attempts to claim, read, or delete ownerless legacy records", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "conversations/legacy"), { title: "Legacy conversation" });
      await setDoc(doc(context.firestore(), "conversations/bob-owned"), { user_id: "bob", title: "Private" });
      await setDoc(doc(context.firestore(), "conversations/alice-owned"), { user_id: "alice", title: "Mine" });
    });

    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(getDoc(doc(aliceDb, "conversations/legacy")));
    await assertFails(updateDoc(doc(aliceDb, "conversations/legacy"), { user_id: "alice" }));
    await assertFails(deleteDoc(doc(aliceDb, "conversations/legacy")));
    await assertFails(updateDoc(doc(aliceDb, "conversations/bob-owned"), { title: "Changed" }));
    await assertFails(deleteDoc(doc(aliceDb, "conversations/bob-owned")));
    await assertSucceeds(updateDoc(doc(aliceDb, "conversations/alice-owned"), { title: "Updated" }));
    await assertSucceeds(deleteDoc(doc(aliceDb, "conversations/alice-owned")));
  });

  it("allows business-memory access only to the owning user", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    const memory = { user_id: "alice", title: "Private business context", content: "Secret" };
    await assertSucceeds(setDoc(doc(aliceDb, "business_memories/alice-note"), memory));
    await assertFails(getDoc(doc(bobDb, "business_memories/alice-note")));
    await assertFails(deleteDoc(doc(bobDb, "business_memories/alice-note")));
    await assertSucceeds(deleteDoc(doc(aliceDb, "business_memories/alice-note")));
  });

  it("lets a signed-in user load and save their own chat settings and devices only", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    await assertSucceeds(setDoc(doc(aliceDb, "user_settings/a1"), { user_id: "alice", setting_key: "custom_instructions", setting_value: "x" }));
    await assertSucceeds(setDoc(doc(aliceDb, "user_sessions/s1"), { user_id: "alice", session_token: "t", is_current: true }));
    for (const col of ["user_settings", "user_sessions"]) {
      await assertSucceeds(getDocs(query(collection(aliceDb, col), where("user_id", "==", "alice"))));
      await assertFails(getDocs(query(collection(bobDb, col), where("user_id", "==", "alice"))));
    }
    await assertSucceeds(updateDoc(doc(aliceDb, "user_sessions/s1"), { last_seen_at: "now" }));
  });
  it("allows admin profile reads while keeping admin role writes privileged", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "profiles/bob"), { id: "bob", email: "bob@example.test", plan: "free" });
    });
    const adminDb = testEnv.authenticatedContext("admin").firestore();
    await assertFails(setDoc(doc(adminDb, "user_roles/alice"), { role: "admin" }));
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "user_roles/admin"), { role: "admin" });
    });
    await assertSucceeds(getDoc(doc(adminDb, "profiles/bob")));
  });
});
