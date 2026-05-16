import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-16">
        {(title || actions) && (
          <header className="border-b border-border bg-surface/40 backdrop-blur-sm">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                {title && (
                  <h1 className="text-2xl sm:text-3xl font-semibold text-fg tracking-tight">
                    {title}
                  </h1>
                )}
                {description && (
                  <p className="mt-1.5 text-sm text-muted max-w-2xl leading-relaxed">
                    {description}
                  </p>
                )}
              </div>
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
          </header>
        )}
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
      <Footer />
    </>
  );
}
