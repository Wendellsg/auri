import { TermsAcceptanceDialog } from "@/components/auth/terms-acceptance-dialog";
import { SiteHeader } from "@/components/layout/site-header";

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(24,24,27,0.08),_transparent_55%)]" />
      <SiteHeader />
      <TermsAcceptanceDialog />
      <main className="mx-auto w-full max-w-7xl px-6 pb-16 pt-8 sm:px-8 lg:px-12">
        {children}
      </main>
    </div>
  );
}
