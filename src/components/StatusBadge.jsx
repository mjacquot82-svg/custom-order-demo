export default function StatusBadge({ status }) {
  const styles = {
    New: "bg-slate-100 text-slate-700",
    "Awaiting Production": "bg-amber-100 text-amber-800",
    "In Production": "bg-indigo-100 text-indigo-800",
    "Ready for Pickup": "bg-sky-100 text-sky-800",
    "Picked Up": "bg-emerald-100 text-emerald-800",
    Completed: "bg-stone-200 text-stone-700",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status] || "bg-slate-100 text-slate-700"}`}>
      {status}
    </span>
  );
}
