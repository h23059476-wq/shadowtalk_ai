import React, { useState } from 'react';
import { X, PlusCircle, Sparkles, Check, AlertTriangle, Layers, Cpu } from 'lucide-react';
import { TelemetryIngestEvent } from '../types';

interface EventIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIngest: (event: TelemetryIngestEvent) => Promise<void>;
}

export const EventIngestionModal: React.FC<EventIngestionModalProps> = ({
  isOpen,
  onClose,
  onIngest
}) => {
  const [eventType, setEventType] = useState<'mission_completed' | 'mission_failed' | 'user_activated' | 'model_called'>('mission_completed');
  const [provider, setProvider] = useState<'Google Gemini' | 'Anthropic' | 'OpenAI' | 'Groq' | 'Mistral'>('Google Gemini');
  const [modelId, setModelId] = useState('gemini-2.0-flash');
  const [tokensTotal, setTokensTotal] = useState(4200);
  const [durationMs, setDurationMs] = useState(1450);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onIngest({
      eventType,
      provider,
      modelId,
      tokensTotal: Number(tokensTotal),
      durationMs: Number(durationMs),
      success: eventType !== 'mission_failed'
    });
    setIsSubmitting(false);
  };

  const handleProviderChange = (p: 'Google Gemini' | 'Anthropic' | 'OpenAI' | 'Groq' | 'Mistral') => {
    setProvider(p);
    if (p === 'Google Gemini') setModelId('gemini-2.0-flash');
    else if (p === 'Anthropic') setModelId('claude-3-5-sonnet');
    else if (p === 'OpenAI') setModelId('gpt-4o');
    else if (p === 'Groq') setModelId('llama-3.3-70b-versatile');
    else if (p === 'Mistral') setModelId('mistral-large-2411');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-[#0d1017] border border-slate-800 rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-white">Record Live Telemetry Event</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-300 mb-1">
              Event Lifecycle Archetype
            </label>
            <div className="grid grid-cols-2 gap-2 font-mono">
              {[
                { id: 'mission_completed', label: 'Mission Completed (Success)' },
                { id: 'mission_failed', label: 'Mission Failed (Error)' },
                { id: 'user_activated', label: 'User Activated' },
                { id: 'model_called', label: 'Raw Model Invocation' }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setEventType(t.id as any)}
                  className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                    eventType === t.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">
                AI Provider
              </label>
              <select
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              >
                <option value="Google Gemini">Google Gemini</option>
                <option value="Anthropic">Anthropic</option>
                <option value="OpenAI">OpenAI</option>
                <option value="Groq">Groq</option>
                <option value="Mistral">Mistral</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Model Identifier
              </label>
              <input
                type="text"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono">
            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Tokens Processed
              </label>
              <input
                type="number"
                value={tokensTotal}
                onChange={(e) => setTokensTotal(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Duration (ms)
              </label>
              <input
                type="number"
                value={durationMs}
                onChange={(e) => setDurationMs(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400 font-mono">
            Zero-PII Assurance: Raw prompt and completion content are stripped prior to ingestion. Only duration, tokens, model ID, and success booleans will be persisted.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Ingesting...' : 'Ingest Event'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
