import { Nav } from "@/components/ui/Nav";

// Every page reads live data from the database.
export const dynamic = "force-dynamic";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-6 pb-16">{children}</main>
    </>
  );
}
