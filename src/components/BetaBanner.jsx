import { useState } from "react";
import { track } from "../lib/analytics";
import { X as XIcon } from "lucide-react";

// Show in dev, or when VITE_BETA is not explicitly "0"
const BETA_ON = import.meta.env.DEV || import.meta.env.VITE_BETA !== "0";

// Optional cutoff: VITE_BETA_END_UTC="2025-12-31T23:59:59Z"
const END = import.meta.env.VITE_BETA_END_UTC
  ? Date.parse(import.meta.env.VITE_BETA_END_UTC)
  : Infinity;

export default function BetaBanner({ onJoin }) {
  const [open, setOpen] = useState(true);

  const SHOULD_RENDER = BETA_ON && Date.now() < END && open;
  if (!SHOULD_RENDER) return null;

  return (
    <div className="w-full bg-blue-600 text-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        <p className="text-sm sm:text-[15px]">
          <span className="font-medium">Free during beta</span> — limited spots. Help shape FlowGestio.
        </p>

        <div className="flex items-center gap-2">
          <button
            className="rounded-xl bg-white px-3.5 py-2 text-sm font-medium text-blue-700 hover:bg-slate-100 shadow"
            onClick={() => {
              track("beta_join_click", { placement: "banner" });
              onJoin?.();
            }}
          >
            Join Beta
          </button>

          <button
            aria-label="Hide banner"
            className="p-2 text-white/80 hover:text-white"
            onClick={() => setOpen(false)}
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
