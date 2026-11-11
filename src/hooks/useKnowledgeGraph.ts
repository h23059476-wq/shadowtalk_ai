import { useState, useCallback, useEffect, useRef } from 'react';
import { backend } from '@/integrations/local/client';
import { useAuth } from '@/components/AuthProvider';

export interface KnowledgeNode {
  id: string;
  user_id: string;
  label: string;
  type: 'entity' | 'concept' | 'topic' | 'memory';
  content: string;
  frequency: number;
  lastMentioned: string; // ISO string
  metadata?: Record<string, unknown>;
}

export interface KnowledgeEdge {
  id: string;
  user_id: string;
  source: string;
  target: string;
  relationship: string;
  weight: number;
}

export interface KnowledgeGraphState {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  isLoading: boolean;
  error: string | null;
}

export interface GraphInsight {
  type: 'frequent_topic' | 'connection' | 'trend' | 'recommendation';
  title: string;
  description: string;
  relatedNodes: string[];
}

const ENTITY_PATTERNS = {
  company: /\b(Google|Apple|Microsoft|Amazon|Meta|OpenAI|Anthropic|Tesla|Netflix|Stripe|Vercel|ShadowTalk backend|[A-Z][a-z]+ (?:Inc|Corp|LLC|Ltd|Company|Co|Labs|AI))\b/g,
  product: /\b((?:the )?[A-Z][a-z]+ (?:Platform|App|Software|System|Tool|Service))\b/g,
  technology: /\b(AI|ML|API|SaaS|Cloud|React|Python|JavaScript|TypeScript|Node\.js|AWS|Azure|GCP|WebGPU|WebAssembly|Docker|Kubernetes|GraphQL|REST|PostgreSQL|MongoDB|Redis|Elasticsearch|Firebase|DynamoDB|Rust|Go|Swift|Kotlin)\b/gi,
  industry: /\b(fintech|healthtech|edtech|proptech|insurtech|legaltech|martech|adtech|biotech|cleantech|cybersecurity|e-commerce|B2B|B2C|D2C|marketplace|subscription|IoT|gaming)\b/gi,
  metric: /\b(revenue|profit|growth|CAC|LTV|MRR|ARR|churn|conversion|ROI|ARPU|NPS|DAU|MAU|burn rate|runway)\b/gi,
  concept: /\b(machine learning|deep learning|neural network|transformer|LLM|RAG|fine-tuning|embeddings|federated learning|zero-knowledge|data sovereignty|differential privacy)\b/gi,
  strategy: /\b(go-to-market|GTM|product-led growth|PLG|freemium|SWOT|OKR|KPI|north star metric|competitive moat|value proposition)\b/gi,
};

export const useKnowledgeGraph = () => {
  const { user } = useAuth();
  const [state, setState] = useState<KnowledgeGraphState>({
    nodes: [],
    edges: [],
    isLoading: true,
    error: null,
  });

  const unsubscribeNodesRef = useRef<(() => void) | null>(null);
  const unsubscribeEdgesRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!user) {
      setState({ nodes: [], edges: [], isLoading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const nodesSub = backend.from('knowledge_nodes').onSnapshot(
        { filter: { field: 'user_id', op: '==', value: user.id } },
        (snapshot: any) => {
          const nodes = snapshot.docs.map((doc: any) => ({ ...doc.data, id: doc.id })) as KnowledgeNode[];
          setState(prev => ({ ...prev, nodes, isLoading: false }));
        },
        (error: any) => {
          console.error('[KnowledgeGraph] Nodes error:', error);
          setState(prev => ({ ...prev, error: error.message, isLoading: false }));
        }
      );
      unsubscribeNodesRef.current = nodesSub.unsubscribe;

      const edgesSub = backend.from('knowledge_edges').onSnapshot(
        { filter: { field: 'user_id', op: '==', value: user.id } },
        (snapshot: any) => {
          const edges = snapshot.docs.map((doc: any) => ({ ...doc.data, id: doc.id })) as KnowledgeEdge[];
          setState(prev => ({ ...prev, edges }));
        },
        (error: any) => {
          console.error('[KnowledgeGraph] Edges error:', error);
        }
      );
      unsubscribeEdgesRef.current = edgesSub.unsubscribe;

    } catch (e: any) {
      console.error('[KnowledgeGraph] Setup error:', e);
      setState(prev => ({ ...prev, isLoading: false, error: e.message }));
    }

    return () => {
      if (unsubscribeNodesRef.current) unsubscribeNodesRef.current();
      if (unsubscribeEdgesRef.current) unsubscribeEdgesRef.current();
    };
  }, [user]);

  const extractEntities = useCallback((text: string): Array<{ label: string; type: string }> => {
    const entities: Array<{ label: string; type: string }> = [];
    const seen = new Set<string>();

    Object.entries(ENTITY_PATTERNS).forEach(([type, pattern]) => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const label = match[1] || match[0];
        const normalized = label.toLowerCase().trim();
        
        if (!seen.has(normalized) && label.length > 2) {
          seen.add(normalized);
          entities.push({ label, type });
        }
      }
    });

    return entities;
  }, []);

  const addNode = useCallback(async (
    label: string,
    type: KnowledgeNode['type'],
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<KnowledgeNode | null> => {
    if (!user) return null;

    const id = `${type}-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const existing = state.nodes.find(n => n.id === id);

    const nodeData = {
      id,
      user_id: user.id,
      label,
      type,
      content: existing?.content ? `${existing.content}\n\n${content}` : content,
      frequency: (existing?.frequency || 0) + 1,
      lastMentioned: new Date().toISOString(),
      metadata: { ...existing?.metadata, ...metadata },
    };

    if (existing) {
      await backend.from('knowledge_nodes').update(nodeData as never).eq('id', id).eq('user_id', user.id);
    } else {
      await backend.from('knowledge_nodes').insert(nodeData as never);
    }

    return nodeData as KnowledgeNode;
  }, [user, state.nodes]);

  const addEdge = useCallback(async (
    sourceId: string,
    targetId: string,
    relationship: string
  ): Promise<KnowledgeEdge | null> => {
    if (!user) return null;

    const id = `${sourceId}-${targetId}`;
    const existingEdge = state.edges.find(e => e.id === id || (e.source === sourceId && e.target === targetId));

    const edgeData = {
      id,
      user_id: user.id,
      source: sourceId,
      target: targetId,
      relationship,
      weight: (existingEdge?.weight || 0) + 1,
    };

    if (existingEdge) {
      await backend.from('knowledge_edges').update(edgeData as never).eq('id', existingEdge.id).eq('user_id', user.id);
    } else {
      await backend.from('knowledge_edges').insert(edgeData as never);
    }

    return edgeData as KnowledgeEdge;
  }, [user, state.edges]);

  const processConversation = useCallback(async (
    messages: Array<{ role: string; content: string }>
  ): Promise<{ nodesAdded: number; edgesAdded: number }> => {
    if (!user) return { nodesAdded: 0, edgesAdded: 0 };
    
    let nodesAdded = 0;
    let edgesAdded = 0;
    const allEntities: Array<{ label: string; type: string; nodeId?: string }> = [];

    for (const message of messages) {
      const entities = extractEntities(message.content);
      
      for (const entity of entities) {
        const node = await addNode(
          entity.label,
          entity.type as KnowledgeNode['type'],
          message.content.slice(0, 500)
        );
        if (node) {
          allEntities.push({ ...entity, nodeId: node.id });
          nodesAdded++;
        }
      }
    }

    for (let i = 0; i < allEntities.length; i++) {
      for (let j = i + 1; j < allEntities.length; j++) {
        if (allEntities[i].nodeId && allEntities[j].nodeId && allEntities[i].nodeId !== allEntities[j].nodeId) {
          await addEdge(allEntities[i].nodeId!, allEntities[j].nodeId!, 'mentioned_with');
          edgesAdded++;
        }
      }
    }

    return { nodesAdded, edgesAdded };
  }, [extractEntities, addNode, addEdge, user]);

  const searchGraph = useCallback((query: string): KnowledgeNode[] => {
    const queryLower = query.toLowerCase();
    return state.nodes
      .filter(node => 
        node.label.toLowerCase().includes(queryLower) ||
        node.content.toLowerCase().includes(queryLower)
      )
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }, [state.nodes]);

  const getRelatedNodes = useCallback((nodeId: string): KnowledgeNode[] => {
    const relatedIds = new Set<string>();
    
    state.edges.forEach(edge => {
      if (edge.source === nodeId) relatedIds.add(edge.target);
      if (edge.target === nodeId) relatedIds.add(edge.source);
    });

    return state.nodes
      .filter(node => relatedIds.has(node.id))
      .sort((a, b) => b.frequency - a.frequency);
  }, [state.nodes, state.edges]);

  const generateInsights = useCallback((): GraphInsight[] => {
    const insights: GraphInsight[] = [];
    const frequentNodes = [...state.nodes].sort((a, b) => b.frequency - a.frequency).slice(0, 5);

    if (frequentNodes.length > 0) {
      insights.push({
        type: 'frequent_topic',
        title: 'Your Top Topics',
        description: `You frequently discuss: ${frequentNodes.map(n => n.label).join(', ')}`,
        relatedNodes: frequentNodes.map(n => n.id),
      });
    }

    const strongEdges = [...state.edges].sort((a, b) => b.weight - a.weight).slice(0, 3);
    strongEdges.forEach(edge => {
      const sourceNode = state.nodes.find(n => n.id === edge.source);
      const targetNode = state.nodes.find(n => n.id === edge.target);
      if (sourceNode && targetNode) {
        insights.push({
          type: 'connection',
          title: `Strong Connection`,
          description: `"${sourceNode.label}" and "${targetNode.label}" are frequently mentioned together (${edge.weight} times)`,
          relatedNodes: [edge.source, edge.target],
        });
      }
    });

    const recentNodes = [...state.nodes].sort((a, b) => new Date(b.lastMentioned).getTime() - new Date(a.lastMentioned).getTime()).slice(0, 3);
    if (recentNodes.length > 0 && recentNodes[0].lastMentioned) {
      insights.push({
        type: 'trend',
        title: 'Recent Focus',
        description: `Your recent discussions have focused on: ${recentNodes.map(n => n.label).join(', ')}`,
        relatedNodes: recentNodes.map(n => n.id),
      });
    }

    return insights;
  }, [state.nodes, state.edges]);

  const getStatistics = useCallback(() => ({
    totalNodes: state.nodes.length,
    totalEdges: state.edges.length,
    nodesByType: state.nodes.reduce((acc, node) => {
      acc[node.type] = (acc[node.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    averageFrequency: state.nodes.length > 0
      ? state.nodes.reduce((sum, n) => sum + n.frequency, 0) / state.nodes.length
      : 0,
  }), [state.nodes, state.edges]);

  const clearGraph = useCallback(async () => {
    if (!user) return;
    
    // Simplistic batch delete logic: just iterate or assume the backend adapter can handle multiple
    for (const node of state.nodes) {
      await backend.from('knowledge_nodes').delete().eq('id', node.id).eq('user_id', user.id);
    }
    for (const edge of state.edges) {
      await backend.from('knowledge_edges').delete().eq('id', edge.id).eq('user_id', user.id);
    }
  }, [user, state.nodes, state.edges]);

  const deleteNode = useCallback(async (nodeId: string) => {
    if (!user) return;
    
    await backend.from('knowledge_nodes').delete().eq('id', nodeId).eq('user_id', user.id);
    
    for (const edge of state.edges) {
      if (edge.source === nodeId || edge.target === nodeId) {
        await backend.from('knowledge_edges').delete().eq('id', edge.id).eq('user_id', user.id);
      }
    }
  }, [user, state.edges]);

  // Cloud synced import (saves to DB immediately)
  const importGraph = useCallback(async (importNodes: KnowledgeNode[], importEdges: KnowledgeEdge[]) => {
    if (!user) return;
    for (const node of importNodes) {
      await backend.from('knowledge_nodes').insert({ ...node, user_id: user.id } as never);
    }
    for (const edge of importEdges) {
      await backend.from('knowledge_edges').insert({ ...edge, user_id: user.id } as never);
    }
  }, [user]);

  return {
    ...state,
    addNode,
    addEdge,
    processConversation,
    searchGraph,
    getRelatedNodes,
    generateInsights,
    getStatistics,
    clearGraph,
    deleteNode,
    importGraph,
  };
};
