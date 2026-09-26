// Shown instantly on navigation while the page loads from the database.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse">
      <div className="h-9 w-64 rounded-lg bg-raised" />
      <div className="mt-3 h-5 w-96 max-w-full rounded bg-raised" />
      <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card aspect-[3/4] bg-raised" />
        ))}
      </div>
    </div>
  );
}
