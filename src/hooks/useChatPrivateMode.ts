import { useCallback, useState } from "react";
import { backend } from "@/integrations/local/client";
import { useToast } from "@/hooks/use-toast";
import type { useE2EE } from "@/hooks/useE2EE";
import {
  isChatAnonymousUiActive,
  isChatPrivateModeActive,
  setChatAnonymousUiActive,
  setChatPrivateModeActive,
} from "@/lib/chatPrivateSession";

type E2EEApi = Pick<
  ReturnType<typeof useE2EE>,
  | "isUnlocked"
  | "isEncrypted"
  | "unwrapEncrypted"
  | "decryptData"
  | "encryptData"
  | "wrapEncrypted"
  | "engageSessionEncryption"
  | "lock"
>;

export function useChatPrivateMode(e2ee: E2EEApi) {
  const { toast } = useToast();
  const [active, setActive] = useState(() => isChatPrivateModeActive());
  const [anonymousUi, setAnonymousUi] = useState(() => isChatAnonymousUiActive());
  const [busy, setBusy] = useState(false);

  const resolveDisplayText = useCallback(
    async (raw: string): Promise<string> => {
      if (!e2ee.isEncrypted(raw)) return raw;
      if (!e2ee.isUnlocked) return "[Encrypted message]";
      const parts = e2ee.unwrapEncrypted(raw);
      if (!parts) return "[Encrypted message]";
      const plain = await e2ee.decryptData(parts.data, parts.iv);
      return plain ?? "[Encrypted message]";
    },
    [e2ee],
  );

  /**
   * Strict encrypt-or-null contract:
   * - Private mode off  → plaintext is fine.
   * - Private mode on   → ciphertext or `null`. NEVER a silent plaintext
   *   fallback (a `null` caller must skip the DB write instead).
   * `forceActive` lets the enable-path encrypt rows in the same tick where
   * the mode is switched on (state closure would still see the old value).
   */
  const wrapForStorage = useCallback(
    async (plaintext: string, forceActive?: boolean): Promise<string | null> => {
      const isActive = forceActive ?? active;
      if (!isActive) return plaintext;
      if (!e2ee.isUnlocked) return null;
      const encrypted = await e2ee.encryptData(plaintext);
      if (!encrypted) return null;
      return e2ee.wrapEncrypted(encrypted.data, encrypted.iv);
    },
    [active, e2ee],
  );

  const encryptConversationInDb = useCallback(
    async (
      conversationId: string,
      rows: { id: string; content: string }[],
      titlePlain = "Private Chat",
      forceActive?: boolean,
    ) => {
      const encryptOrFail = async (plain: string): Promise<string> => {
        if (e2ee.isEncrypted(plain)) return plain;
        const wrapped = await wrapForStorage(plain, forceActive);
        if (wrapped === null) {
          throw new Error("Encryption failed — plaintext was not persisted.");
        }
        return wrapped;
      };

      for (const row of rows) {
        if (row.id === "welcome") continue;
        const contentToSave = await encryptOrFail(row.content);
        if (contentToSave !== row.content) {
          await backend.from("messages").update({ content: contentToSave }).eq("id", row.id);
        }
      }

      const titleToSave = await encryptOrFail(titlePlain);
      await backend
        .from("conversations")
        .update({ title: titleToSave, updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    },
    [wrapForStorage, e2ee],
  );

  const enablePrivateMode = useCallback(
    async (options: {
      conversationId: string | null;
      messages: { id: string; content: string }[];
      isGuest: boolean;
    }) => {
      setBusy(true);
      try {
        const engaged = await e2ee.engageSessionEncryption();
        if (!engaged) {
          toast({
            title: "Encryption failed",
            description: "Could not start the security engine. Try again.",
            variant: "destructive",
          });
          return false;
        }

        setChatPrivateModeActive(true);
        setChatAnonymousUiActive(true);
        setActive(true);
        setAnonymousUi(true);

        if (options.conversationId && !options.isGuest) {
          // forceActive: the `active` state closure is still false in this
          // tick — without the override every row would be "encrypted" as
          // plaintext while the UI claims E2EE protection.
          await encryptConversationInDb(options.conversationId, options.messages, "Private Chat", true);
        }

        toast({
          title: "Chat secured",
          description:
            "This conversation is encrypted end-to-end. Your identity is hidden in the UI for this session.",
        });
        return true;
      } catch (err) {
        console.error("[ChatPrivate] enable failed:", err);
        toast({
          title: "Could not secure chat",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
        return false;
      } finally {
        setBusy(false);
      }
    },
    [e2ee, encryptConversationInDb, toast],
  );

  const disablePrivateMode = useCallback(() => {
    setChatPrivateModeActive(false);
    setChatAnonymousUiActive(false);
    setActive(false);
    setAnonymousUi(false);
    e2ee.lock();
    toast({
      title: "Private mode off",
      description: "New messages are no longer encrypted. Existing ciphertext stays locked until you re-enable.",
    });
  }, [e2ee, toast]);

  const encryptLocalMessages = useCallback(
    async (messages: { id: string; content: string }[]) => {
      const out: { id: string; content: string }[] = [];
      for (const m of messages) {
        if (m.id === "welcome") {
          out.push(m);
          continue;
        }
        if (e2ee.isEncrypted(m.content)) {
          out.push(m);
          continue;
        }
        const wrapped = await wrapForStorage(m.content);
        if (wrapped === null) {
          throw new Error("Encryption failed — message was not saved.");
        }
        out.push({ id: m.id, content: wrapped });
      }
      return out;
    },
    [wrapForStorage, e2ee],
  );

  return {
    active,
    anonymousUi,
    busy,
    resolveDisplayText,
    wrapForStorage,
    enablePrivateMode,
    disablePrivateMode,
    encryptLocalMessages,
  };
}
