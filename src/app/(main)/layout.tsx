import { Nav } from "@/components/ui/Nav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-8 lg:pb-24 sm:px-8 sm:pt-12">{children}</main>
    </>
  );
}
