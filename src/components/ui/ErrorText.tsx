export function ErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="my-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
      {error}
    </p>
  );
}
