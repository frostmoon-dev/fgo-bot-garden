import { Nav } from "@/components/ui/Nav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-12 sm:px-8">{children}</main>
    </>
  );
}
