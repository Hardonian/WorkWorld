"use client";

import React, { useState } from "react";
import type { VoiceCallSession, VoiceNegotiationTerms } from "../../domain/voice.ts";

interface LiveCallModalProps {
  session: VoiceCallSession | null;
  isOpen: boolean;
  onAnswer: () => void;
  onHangup: () => void;
  onCommitTerms?: (terms: VoiceNegotiationTerms) => void;
}

export function LiveCallModal({
  session,
  isOpen,
  onAnswer,
  onHangup,
  onCommitTerms,
}: LiveCallModalProps) {
  const [agreedDay, setAgreedDay] = useState<number>(3);
  const [agreedPriceCad, setAgreedPriceCad] = useState<string>("32.00");
  const [waivedFee, setWaivedFee] = useState<boolean>(true);

  if (!isOpen || !session) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Incoming Phone Call"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header / Caller Banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 text-white text-center relative">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/20 flex items-center justify-center text-2xl shadow-inner">
            📞
          </div>
          <h2 className="text-xl font-bold tracking-tight">{session.caller.name}</h2>
          <p className="text-indigo-200 text-sm">{session.caller.role} &middot; {session.caller.organization}</p>
          <p className="text-xs text-indigo-300 font-mono mt-1">{session.caller.phoneNumber}</p>

          {session.status === "ringing" && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400 text-amber-950 text-xs font-semibold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              Incoming Call...
            </div>
          )}

          {session.status === "connected" && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-200 text-xs font-semibold border border-emerald-400/40">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Call Connected (Live Audio)
            </div>
          )}
        </div>

        {/* Audio Waveform & Transcript Area */}
        <div className="p-6 flex-1 max-h-80 overflow-y-auto space-y-4 bg-slate-50 dark:bg-slate-950">
          {session.status === "connected" && (
            <div className="flex items-center justify-center gap-1 py-2">
              <span className="w-1 h-4 bg-indigo-500 rounded animate-pulse" />
              <span className="w-1 h-8 bg-indigo-500 rounded animate-pulse delay-75" />
              <span className="w-1 h-6 bg-indigo-500 rounded animate-pulse delay-150" />
              <span className="w-1 h-10 bg-indigo-500 rounded animate-pulse delay-100" />
              <span className="w-1 h-5 bg-indigo-500 rounded animate-pulse delay-200" />
            </div>
          )}

          <div className="space-y-3 text-sm">
            {session.transcript.map((utt) => (
              <div
                key={utt.id}
                className={`p-3 rounded-xl max-w-[85%] ${
                  utt.speaker === "caller"
                    ? "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 mr-auto shadow-sm"
                    : "bg-indigo-600 text-white ml-auto shadow-sm"
                }`}
              >
                <div className="text-[11px] font-medium opacity-70 mb-1">
                  {utt.speaker === "caller" ? session.caller.name : "You"}
                </div>
                <p>{utt.text}</p>
              </div>
            ))}
          </div>

          {/* Term Commitment Panel (When connected) */}
          {session.status === "connected" && onCommitTerms && (
            <div className="mt-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/50 shadow-sm space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                Live Negotiated Terms
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1">Agreed Delivery Day</label>
                  <input
                    type="number"
                    value={agreedDay}
                    onChange={(e) => setAgreedDay(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1">Agreed Unit Price (CAD)</label>
                  <input
                    type="text"
                    value={agreedPriceCad}
                    onChange={(e) => setAgreedPriceCad(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={waivedFee}
                    onChange={(e) => setWaivedFee(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Waive Emergency Freight Fee</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    onCommitTerms({
                      agreedDeliveryDay: agreedDay,
                      agreedUnitPriceMinor: Math.round(parseFloat(agreedPriceCad || "0") * 100),
                      waivedExpediteFee: waivedFee,
                      notes: "Verbal agreement locked via live phone negotiation.",
                    })
                  }
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition"
                >
                  Confirm Terms
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-3">
          {session.status === "ringing" ? (
            <>
              <button
                type="button"
                onClick={onHangup}
                className="px-4 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 font-medium text-sm transition"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={onAnswer}
                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition shadow-lg shadow-emerald-600/30 flex items-center gap-2"
              >
                <span>Answer Call</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onHangup}
              className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm transition flex items-center gap-2"
            >
              <span>End Call</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
