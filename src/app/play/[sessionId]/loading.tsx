// Shown instantly when opening a story, while its messages load.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading story" className="flex h-dvh w-full items-end bg-black p-4 sm:p-8">
      <div className="mx-auto h-40 w-full max-w-4xl animate-pulse rounded-2xl bg-white/10" />
    </div>
  );
}
