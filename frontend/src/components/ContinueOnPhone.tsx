import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import { API_BASE_URL } from '../config/api';

type HandoffState = 'idle' | 'waiting' | 'done';

interface VerificationResult {
  status: string;
  confidence_score?: number;
  face_match_score?: number;
  liveness_score?: number;
  [key: string]: any;
}

interface ContinueOnPhoneProps {
  apiKey: string;
  userId: string;
  onComplete: (result: VerificationResult) => void;
}

export const ContinueOnPhone: React.FC<ContinueOnPhoneProps> = ({
  apiKey,
  userId,
  onComplete,
}) => {
  const [state, setState] = useState<HandoffState>('idle');
  const [mobileUrl, setMobileUrl] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  // Fix 1: mounted-ref guard
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; clearTimers(); };
  }, []);

  // Fix 2: onComplete ref to prevent stale closure
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; });

  const generateQR = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/verify/handoff/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, user_id: userId }),
      });
      if (!res.ok) throw new Error('Failed to create handoff session');
      const data = await res.json();

      // Fix 3: validate required fields before use
      if (!data.token || !data.expires_at) {
        throw new Error("Handoff response missing required fields");
      }
      const expiry = new Date(data.expires_at);
      if (isNaN(expiry.getTime())) {
        throw new Error("Invalid expires_at value from server");
      }

      // Fix 1: bail if component unmounted while awaiting fetch
      if (!mountedRef.current) return;

      const url = `${window.location.origin}/verify/mobile?token=${data.token}`;

      setMobileUrl(url);
      setTimeLeft(Math.floor((expiry.getTime() - Date.now()) / 1000));
      setState('waiting');
      startTimers(data.token, expiry);
    } catch (err) {
      console.error('Failed to generate QR:', err);
      setError('Could not generate QR code. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const startTimers = (tok: string, expiry: Date) => {
    // Countdown
    timerRef.current = setInterval(() => {
      const left = Math.floor((expiry.getTime() - Date.now()) / 1000);
      if (left <= 0) { clearTimers(); setState('idle'); }
      else setTimeLeft(left);
    }, 1000);

    // Status poll every 3 seconds
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/verify/handoff/${tok}/status`);
        if (res.status === 410) { clearTimers(); setState('idle'); return; }
        if (!res.ok) return;
        const data = await res.json();
        if (data.status !== 'pending') {
          clearTimers();
          setResult(data.result ?? { status: data.status });
          setState('done');
          // Fix 2: use ref so we always call the latest onComplete prop
          onCompleteRef.current(data.result ?? { status: data.status });
        }
      } catch { /* network hiccup — retry next tick */ }
    }, 3000);
  };

  const cancel = () => {
    clearTimers();
    setState('idle');
    setMobileUrl(null);
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // ── IDLE ──
  if (state === 'idle') {
    return (
      <div className="border border-gray-200 rounded-2xl p-6 flex flex-col items-center text-center h-full justify-center gap-3">
        <div className="text-4xl">📱</div>
        <div>
          <h3 className="font-semibold text-gray-900">Continue on Phone</h3>
          <p className="text-sm text-gray-500 mt-1">
            Scan a QR code to complete verification on your mobile device
          </p>
        </div>
        <button
          onClick={generateQR}
          disabled={!apiKey || !userId || isGenerating}
          className="mt-1 w-full py-2.5 px-4 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? 'Generating…' : 'Generate QR Code'}
        </button>
        {/* Fix 4: user-visible error message */}
        {error && (
          <p role="alert" className="text-xs text-red-500 mt-1">{error}</p>
        )}
      </div>
    );
  }

  // ── WAITING ──
  if (state === 'waiting') {
    return (
      <div className="border-2 border-blue-200 bg-blue-50 rounded-2xl p-6 flex flex-col items-center text-center gap-3">
        <p className="text-sm font-medium text-gray-700">Scan with your phone camera</p>
        <div className="bg-white p-3 rounded-xl shadow-sm">
          {mobileUrl && <QRCode value={mobileUrl} size={180} />}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse flex-shrink-0" />
          <span>Waiting for phone…</span>
          <span className="font-mono text-blue-600 font-medium">{fmt(timeLeft)}</span>
        </div>
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); cancel(); }}
          className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
        >
          Cancel — use this device instead
        </a>
      </div>
    );
  }

  // ── DONE ──
  const statusMap: Record<string, { icon: string; color: string; label: string }> = {
    verified:      { icon: '✓', color: 'text-emerald-600', label: 'Verified' },
    completed:     { icon: '✓', color: 'text-emerald-600', label: 'Verified' },
    failed:        { icon: '✗', color: 'text-red-500',     label: 'Failed' },
    manual_review: { icon: '⏳', color: 'text-yellow-600', label: 'Pending Review' },
  };
  const cfg = statusMap[result?.status ?? ''] ?? statusMap.manual_review;

  return (
    <div className="border border-gray-200 rounded-2xl p-6 flex flex-col items-center text-center gap-2">
      <div className={`text-5xl font-bold ${cfg.color}`}>{cfg.icon}</div>
      <h3 className={`font-semibold text-lg ${cfg.color}`}>{cfg.label}</h3>
      <p className="text-sm text-gray-500">Completed on mobile device</p>
      {result?.confidence_score != null && (
        <p className="text-sm text-gray-600 mt-1">
          Confidence: {Math.round(result.confidence_score * 100)}%
        </p>
      )}
      {result?.face_match_score != null && (
        <p className="text-sm text-gray-600">
          Face match: {Math.round(result.face_match_score * 100)}%
        </p>
      )}
      {result?.liveness_score != null && (
        <p className="text-sm text-gray-600">
          Liveness: {Math.round(result.liveness_score * 100)}%
        </p>
      )}
    </div>
  );
};
