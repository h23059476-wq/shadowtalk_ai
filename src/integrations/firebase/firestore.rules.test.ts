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

  // ---------------------------------------------------------------
  // Batch 3 — strict profile field whitelist + privilege-escalation
  // ---------------------------------------------------------------
  it("denies unauthenticated profile creation and reads", async () => {
    const anonDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(anonDb, "profiles/anon"), { id: "anon", plan: "free" }));
    await assertFails(getDoc(doc(anonDb, "profiles/bob")));
  });

  it("denies a user from creating another user's profile document", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(aliceDb, "profiles/bob"), { id: "bob", user_id: "bob", plan: "free" }));
  });

  it("allows a user to create their own profile with only allowed fields and plan=free", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(setDoc(doc(aliceDb, "profiles/alice"), {
      id: "alice", user_id: "alice", email: "alice@example.test",
      display_name: "Alice", plan: "free", created_at: serverTimestamp(), updated_at: serverTimestamp(),
    }));
  });

  it("denies profile creation with a non-free plan (privilege escalation)", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(aliceDb, "profiles/alice"), {
      id: "alice", user_id: "alice", plan: "pro",
    }));
  });

  it("denies profile creation with privileged fields outside the whitelist", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(aliceDb, "profiles/alice"), {
      id: "alice", plan: "free", subscription_end: "2099-12-31",
    }));
    await assertFails(setDoc(doc(aliceDb, "profiles/alice"), {
      id: "alice", plan: "free", role: "admin",
    }));
    await assertFails(setDoc(doc(aliceDb, "profiles/alice"), {
      id: "alice", plan: "free", is_admin: true,
    }));
    await assertFails(setDoc(doc(aliceDb, "profiles/alice"), {
      id: "alice", plan: "free", entitlements: ["everything"],
    }));
  });

  it("allows an owner to update non-privileged profile fields", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "profiles/alice"), {
        id: "alice", user_id: "alice", plan: "free", display_name: "Alice",
      });
    });
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(updateDoc(doc(aliceDb, "profiles/alice"), {
      display_name: "Alice Smith", bio: "Updated bio", notification_email: false,
      updated_at: serverTimestamp(),
    }));
  });

  it("denies an owner from escalating plan or subscription_end via update", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "profiles/alice"), {
        id: "alice", user_id: "alice", plan: "free",
      });
    });
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(updateDoc(doc(aliceDb, "profiles/alice"), { plan: "pro" }));
    await assertFails(updateDoc(doc(aliceDb, "profiles/alice"), { subscription_end: "2099-12-31" }));
    await assertFails(updateDoc(doc(aliceDb, "profiles/alice"), { created_at: serverTimestamp() }));
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    await assertFails(updateDoc(doc(bobDb, "profiles/alice"), { display_name: "Hacked" }));
  });

  it("allows an admin to upgrade a profile plan (admin override)", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "profiles/alice"), {
        id: "alice", user_id: "alice", plan: "free",
      });
      await setDoc(doc(context.firestore(), "user_roles/admin"), { role: "admin" });
    });
    const adminDb = testEnv.authenticatedContext("admin").firestore();
    await assertSucceeds(updateDoc(doc(adminDb, "profiles/alice"), {
      plan: "pro", subscription_end: "2027-01-01",
    }));
  });

  // ---------------------------------------------------------------
  // Batch 3 — analytics_events field-name correctness (snake_case)
  // ---------------------------------------------------------------
  it("allows analytics_events create with the writer's snake_case fields", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(setDoc(doc(aliceDb, "analytics_events/evt1"), {
      event_name: "page_view", session_id: "sess-123", timestamp: serverTimestamp(),
    }));
  });

  it("denies analytics_events create when required snake_case fields are missing", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(aliceDb, "analytics_events/evt2"), {
      eventName: "page_view", sessionId: "sess-123", timestamp: serverTimestamp(),
    }));
    await assertFails(setDoc(doc(aliceDb, "analytics_events/evt3"), {
      event_name: "page_view", timestamp: serverTimestamp(),
    }));
  });

  // ---------------------------------------------------------------
  // Batch 3 — per-user collection cross-user isolation (user_memories)
  // ---------------------------------------------------------------
  it("isolates per-user memories across accounts", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    await assertSucceeds(setDoc(doc(aliceDb, "user_memories/alice-fact"), {
      user_id: "alice", content: "Alice prefers concise answers",
    }));
    await assertFails(getDoc(doc(bobDb, "user_memories/alice-fact")));
    await assertFails(updateDoc(doc(bobDb, "user_memories/alice-fact"), { content: "tampered" }));
    await assertFails(deleteDoc(doc(bobDb, "user_memories/alice-fact")));
    await assertSucceeds(getDoc(doc(aliceDb, "user_memories/alice-fact")));
    await assertSucceeds(updateDoc(doc(aliceDb, "user_memories/alice-fact"), { content: "updated" }));
    await assertSucceeds(deleteDoc(doc(aliceDb, "user_memories/alice-fact")));
  });

  it("preserves the existing conversations + messages ownership workflow", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    await assertSucceeds(setDoc(doc(aliceDb, "conversations/conv-1"), {
      user_id: "alice", title: "Alice's chat", updated_at: serverTimestamp(),
    }));
    await assertSucceeds(setDoc(doc(aliceDb, "messages/msg-1"), {
      user_id: "alice", conversation_id: "conv-1", content: "hello", role: "user",
    }));
    await assertFails(getDoc(doc(bobDb, "conversations/conv-1")));
    await assertFails(getDoc(doc(bobDb, "messages/msg-1")));
    await assertFails(updateDoc(doc(bobDb, "conversations/conv-1"), { user_id: "bob" }));
    await assertSucceeds(updateDoc(doc(aliceDb, "conversations/conv-1"), { title: "renamed" }));
  });
});
