import React, { useEffect, useState } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import apiClient from '../services/api';
import type { ProviderSummary, ProviderType } from '../types.js';

type Days = 7 | 30 | 90;

interface ProviderCard {
  type: ProviderType;
  label: string;
  data: ProviderSummary;
}

const PROVIDERS: { type: ProviderType; label: string }[] = [
  { type: 'ocr', label: 'OCR' },
  { type: 'face', label: 'Face Matching' },
  { type: 'liveness', label: 'Liveness' },
];

export default function ProviderMetrics() {
  const [days, setDays] = useState<Days>(7);
  const [cards, setCards] = useState<ProviderCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = async (d: Days) => {
    setLoading(true);
    setError(null);
    setCards([]);
    try {
      const [ocr, face, liveness] = await Promise.all([
        apiClient.getProviderMetrics('ocr', d),
        apiClient.getProviderMetrics('face', d),
        apiClient.getProviderMetrics('liveness', d),
      ]);
      setCards([
        { type: 'ocr', label: 'OCR', data: ocr },
        { type: 'face', label: 'Face Matching', data: face },
        { type: 'liveness', label: 'Liveness', data: liveness },
      ]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load provider metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(days); }, [days]);

  const pct = (n: number) => `${Math.min(100, Math.max(0, Math.round(n * 100)))}%`;
  const ms = (n: number) => `${Math.round(n)}ms`;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <BarChart3 className="h-8 w-8 text-blue-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Provider Performance</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              OCR, face matching, and liveness provider metrics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 border rounded-lg p-1 bg-gray-50">
            {([7, 30, 90] as Days[]).map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                disabled={loading}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors disabled:opacity-50 ${
                  days === d
                    ? 'bg-white shadow text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <button
            onClick={() => loadAll(days)}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 flex items-center"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-xl p-5 animate-pulse bg-gray-50 h-36" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {cards.map((c) => (
            <div key={c.type} className="border rounded-xl p-5 bg-white shadow-sm">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                {c.label}
              </div>
              <div className="text-sm text-gray-500 mb-3 font-mono truncate">{c.data.providerName}</div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Success</span>
                  <span className={`font-semibold ${c.data.successRate >= 0.9 ? 'text-green-600' : 'text-amber-600'}`}>
                    {pct(c.data.successRate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Avg Latency</span>
                  <span className="font-semibold text-gray-700">{ms(c.data.avgLatencyMs)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Avg Confidence</span>
                  <span className="font-semibold text-gray-700">{pct(c.data.avgConfidence)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Requests</span>
                  <span className="font-semibold text-gray-700">{c.data.totalRequests.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
