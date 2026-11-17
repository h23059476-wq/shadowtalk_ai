/**
 * useLocalChatModels — state for the chat header's on-device model switcher.
 *
 * Lists every DOWNLOADED (cached) on-device chat model and lets the user
 * switch to one — or back to the house cloud model — from the model dropdown,
 * without visiting the model manager. Switching mirrors the two pieces of
 * state the chat router actually reads:
 *
 *   1. `setPreferLocal(uid, true|false)`  — hybrid routing flag (aiAccessMode)
 *   2. `switchActiveModel(modelId)`       — engine activation (modelManager)
 *
 * Cached models activate in seconds (weights are already in the browser);
 * nothing here ever starts a download — downloads belong to the model
 * manager. The listing refreshes when the dropdown opens, when the engine
 * reports a state change (background install finished → new model appears),
 * and right after a switch.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { LocalModelDefinition } from "@/ai/ModelRegistry";
import { getPreferLocal, setPreferLocal } from "@/lib/aiAccessMode";
import {
  chatModelOptions,
  isModelDownloaded,
  resolvePrimaryLocalModel,
} from "@/lib/localModelCatalog";
import { hasModelInCache, switchActiveModel } from "@/services/modelManager";
import { localInferenceEngine, type LocalEngineState } from "@/offline/LocalInferenceEngine";

export interface LocalChatModelOption {
  id: string;
  displayName: string;
  sizeMB: number;
  /** Weights are in this browser's cache — activatable in seconds. */
  downloaded: boolean;
  /** Loaded in the engine right now (ready or generating). */
  active: boolean;
}

/** Guests share one routing slot — the router reads the same key. */
export const GUEST_LOCAL_UID = "guest";

export function useLocalChatModels(menuOpen: boolean, uid?: string) {
  const routingUid = uid || GUEST_LOCAL_UID;
  const [options, setOptions] = useState<LocalChatModelOption[]>([]);
  const [engineState, setEngineState] = useState<LocalEngineState>(localInferenceEngine.getState());
  const [engineModelId, setEngineModelId] = useState<string>(localInferenceEngine.getCurrentModelId());
  const [localPreferred, setLocalPreferred] = useState<boolean>(() => getPreferLocal(routingUid));
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    const preferred = getPreferLocal(routingUid);
    setLocalPreferred(preferred);
    const defs = chatModelOptions();
    // One pass: cache status for every chat model + its device twin.
    const cachedIds = new Set<string>();
    await Promise.all(
      defs.flatMap((def) => [def.id, def.fallbackModelId]).filter((id): id is string => !!id).map(async (id) => {
        if (await hasModelInCache(id).catch(() => false)) cachedIds.add(id);
      }),
    );
    const engineLoaded = localInferenceEngine.isLoaded();
    const activeId = localInferenceEngine.getCurrentModelId();
    setOptions(
      defs.map((def: LocalModelDefinition) => ({
        id: def.id,
        displayName: def.displayName,
        sizeMB: def.approxStorageRequirementMB,
        downloaded: isModelDownloaded(def.id, cachedIds),
        active: engineLoaded && activeId === def.id,
      })),
    );
  }, [routingUid]);

  // Engine state changes → keep the active row + trigger label honest. A
  // finished background install flips a model to downloaded, so re-list then.
  useEffect(() => {
    mountedRef.current = true;
    const unsub = localInferenceEngine.subscribe((state) => {
      if (!mountedRef.current) return;
      setEngineState(state);
      setEngineModelId(localInferenceEngine.getCurrentModelId());
      if (state === "ready") void refresh();
    });
    return () => {
      mountedRef.current = false;
      unsub();
    };
  }, [refresh]);

  // Listing is only fetched while the dropdown is open — no cache probing on
  // every chat render.
  useEffect(() => {
    if (menuOpen) void refresh();
  }, [menuOpen, refresh]);

  /**
   * Switch the next replies to an on-device model: flips the routing flag
   * first (so the very next message goes local) and activates the cached
   * model in the engine. Never downloads — uncached ids are not offered.
   */
  const switchToLocalModel = useCallback(
    async (modelId: string): Promise<boolean> => {
      setSwitchingId(modelId);
      try {
        setPreferLocal(routingUid, true);
        setLocalPreferred(true);
        const ok = await switchActiveModel(modelId);
        await refresh();
        return ok;
      } catch (error) {
        console.warn("[useLocalChatModels] switch failed:", error);
        return false;
      } finally {
        setSwitchingId(null);
      }
    },
    [routingUid, refresh],
  );

  /** Back to the house cloud model — routing flag only; the engine stays warm. */
  const switchToCloud = useCallback(() => {
    setPreferLocal(routingUid, false);
    setLocalPreferred(false);
  }, [routingUid]);

  /** The local model the trigger should name when local routing is on. */
  const selectedLocalModel: LocalChatModelOption | null = localPreferred
    ? (() => {
        const def = resolvePrimaryLocalModel(engineModelId);
        if (!def) return null;
        const option = options.find((o) => o.id === def.id);
        return {
          id: def.id,
          displayName: def.displayName,
          sizeMB: def.approxStorageRequirementMB,
          downloaded: option?.downloaded ?? true,
          active: option?.active ?? false,
        };
      })()
    : null;

  const downloadedModels = options.filter((o) => o.downloaded);

  return {
    options,
    downloadedModels,
    engineState,
    engineModelId,
    localPreferred,
    selectedLocalModel,
    switchingId,
    refresh,
    switchToLocalModel,
    switchToCloud,
  };
}
