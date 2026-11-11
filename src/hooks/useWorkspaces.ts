import { useState, useEffect, useCallback, useRef } from "react";
import { backend } from "@/integrations/local/client";
import { useAuth } from "@/components/AuthProvider";

// Re-using the Project interface from ShadowCowork
export interface FileNode {
  name: string;
  type: "file" | "folder";
  path: string;
  content?: string;
  children?: FileNode[];
  expanded?: boolean;
  language?: string;
}

export interface GitCommit {
  id: string;
  message: string;
  timestamp: Date;
  files: string[];
  snapshot: FileNode[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  files: FileNode[];
  commits: GitCommit[];
  currentBranch: string;
  branches: string[];
}

export interface Workspace {
  id: string;
  owner_id: string;
  name: string;
  projects: Project[];
  active_project_id: string;
  members: string[]; // array of user IDs
  created_at: string;
  updated_at: string;
}

export function useWorkspaces(workspaceId?: string) {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Setup real-time listener for the workspace
  useEffect(() => {
    if (!user || !workspaceId) {
      setWorkspace(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    try {
      const sub = backend
        .from("workspaces")
        .onSnapshot(
          {
            filter: {
              and: [
                { field: "id", op: "==", value: workspaceId },
                { field: "user_id", op: "==", value: user.id },
              ],
            },
          },
          (snapshot) => {
            if (snapshot.docs.length > 0) {
              const data = snapshot.docs[0].data;
              setWorkspace({
                ...data,
                id: snapshot.docs[0].id,
              } as Workspace);
            } else {
              setWorkspace(null);
            }
            setIsLoading(false);
          },
          (err) => {
            console.error("[useWorkspaces] Snapshot error:", err);
            setIsLoading(false);
          }
        );
      unsubscribeRef.current = sub.unsubscribe;
    } catch (err) {
      console.error("[useWorkspaces] Listen setup error:", err);
      setIsLoading(false);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [user, workspaceId]);

  // Method to update the workspace (projects, active project, etc.)
  const updateWorkspace = useCallback(
    async (updates: Partial<Workspace>) => {
      if (!user || !workspaceId) return;

      try {
        await backend.from("workspaces").update(
          {
            ...updates,
            updated_at: new Date().toISOString(),
          } as never
        ).eq("id", workspaceId);
      } catch (err) {
        console.error("[useWorkspaces] Update error:", err);
      }
    },
    [user, workspaceId]
  );

  // Method to create a new workspace
  const createWorkspace = useCallback(
    async (name: string, initialProjects: Project[]): Promise<string | null> => {
      if (!user) return null;

      try {
        const { data, error } = await backend
          .from("workspaces")
          .insert({
            id: crypto.randomUUID(),
            owner_id: user.id,
            user_id: user.id,
            name,
            projects: initialProjects,
            active_project_id: initialProjects[0]?.id || "default",
            members: [user.id],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as never)
          .select()
          .single();

        if (error) throw new Error(error.message);
        return data?.id as string;
      } catch (err) {
        console.error("[useWorkspaces] Create error:", err);
        return null;
      }
    },
    [user]
  );

  // Method to join an existing workspace
  const joinWorkspace = useCallback(
    async (targetWorkspaceId: string): Promise<boolean> => {
      if (!user) return false;

      try {
        // First get the workspace
        const { data, error } = await backend
          .from("workspaces")
          .select("members")
          .eq("id", targetWorkspaceId)
          .single();

        if (error || !data) return false;

        const members = (data.members as string[]) || [];
        if (!members.includes(user.id)) {
          // Add user to members
          const updatedMembers = [...members, user.id];
          const { error: updateErr } = await backend
            .from("workspaces")
            .update({ members: updatedMembers } as never)
            .eq("id", targetWorkspaceId);

          if (updateErr) return false;
        }

        return true;
      } catch (err) {
        console.error("[useWorkspaces] Join error:", err);
        return false;
      }
    },
    [user]
  );

  return {
    workspace,
    isLoading,
    updateWorkspace,
    createWorkspace,
    joinWorkspace,
  };
}
