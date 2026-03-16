// flowgestio-frontend/src/components/alternatives/OptionCard.jsx
import React from "react";

export default function OptionCard({
  option,
  isActive,
  onSelect,
  onToggleViable,
  onDelete,
}) {
  const locked = option?.id === "status_quo" || option?.type === "status_quo";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "w-full text-left rounded-xl border p-3 transition",
        isActive ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-slate-900 truncate">
              {option?.name || "Untitled option"}
            </div>
            <span className="text-xs rounded-full px-2 py-0.5 border border-slate-200 bg-white text-slate-600">
              {option?.type || "custom"}
            </span>
          </div>

          {option?.description ? (
            <div className="mt-1 text-xs text-slate-600 line-clamp-2">
              {option.description}
            </div>
          ) : (
            <div className="mt-1 text-xs text-slate-400 italic">
              No description yet
            </div>
          )}

          <div className="mt-2 flex items-center gap-2">
            <label className="inline-flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={!!option?.viable}
                onChange={(e) => onToggleViable?.(e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                className="h-4 w-4"
              />
              Viable
            </label>

            {!!option?.sources?.length && (
              <span className="text-xs text-slate-500">
                📚 {option.sources.length} source{option.sources.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {!locked && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
              className="text-xs text-red-600 hover:underline"
            >
              Delete
            </button>
          )}
          {locked && (
            <span className="text-[11px] text-slate-400">Required</span>
          )}
        </div>
      </div>
    </button>
  );
}
