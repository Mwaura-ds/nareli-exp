// Todo — visible, honest reminder marker for known-unfinished work.
// Use ONLY for real outstanding items (tracked work), never for fine-tuning.
export default function Todo({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="ml-2 inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-amber-800"
      title="Owner reminder"
    >
      <span aria-hidden>⏳</span> {children}
    </span>
  );
}
