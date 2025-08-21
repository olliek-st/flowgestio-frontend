import React from "react";

export function AiBar({ busy, onDraft, onImprove, onConcise, onLonger, onFormal }) {
  const cls = "rounded-xl border px-3 py-2 hover:bg-slate-50 disabled:opacity-50";
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <button onClick={onDraft} disabled={busy} className={cls}>Draft</button>
      <button onClick={onImprove} disabled={busy} className={cls}>Improve writing</button>
      <button onClick={onConcise} disabled={busy} className={cls}>Make concise</button>
      <button onClick={onLonger} disabled={busy} className={cls}>Make longer</button>
      <button onClick={onFormal} disabled={busy} className={cls}>More formal</button>
    </div>
  );
}
