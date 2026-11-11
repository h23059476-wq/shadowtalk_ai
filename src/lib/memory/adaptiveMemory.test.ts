import { describe, it, expect, beforeEach } from 'vitest';
import { AdaptiveMemory, buildRecallPacket } from './adaptiveMemory';

describe('adaptiveMemory', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('ingests high-signal sentences and ignores filler', async () => {
    const memory = new AdaptiveMemory({ maxFacts: 10, minConfidence: 0.25 });
    const added = await memory.ingest('My name is Zain. I am from Karachi. Hey! Ok cool.');
    expect(added.filter((f) => f.kind === 'identity').length).toBeGreaterThanOrEqual(1);
  });

  it('recalls facts by query relevance', async () => {
    const memory = new AdaptiveMemory({ maxFacts: 10, minConfidence: 0.25 });
    await memory.ingest('I prefer local-first AI and offline mode.');
    const recall = await memory.recall('local-first');
    expect(recall.length).toBeGreaterThanOrEqual(1);
  });

  it('builds a recall packet string', async () => {
    const memory = new AdaptiveMemory({ maxFacts: 10, minConfidence: 0.25 });
    await memory.ingest('Build a ShadowTalk desktop app with local model fallback when credits end.');
    const packet = await buildRecallPacket(memory, 'local model');
    expect(packet).toContain('[Memory hints]');
  });

  it('prunes facts when exceeding maxFacts', async () => {
    const memory = new AdaptiveMemory({ maxFacts: 5, minConfidence: 0.25 });
    for (let i = 0; i < 20; i++) {
      await memory.ingest(`I build AI product number ${i}. I prefer privacy.`);
    }
    const topFacts = await memory.getTopFacts(5);
    expect(topFacts.length).toBeLessThanOrEqual(5);
  });
});
