import { Nav } from "@/components/ui/Nav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-8 sm:pb-24 sm:pt-12">{children}</main>
    </>
  );
}
