import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import SupportChat from "@/components/SupportChat";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "FixFlow — Find Repair Pros at Your Price" },
      { name: "description", content: "Post repair requests, get competitive offers from verified workers, and negotiate the best price." },
      { name: "author", content: "FixFlow" },
      { property: "og:title", content: "FixFlow — Find Repair Pros at Your Price" },
      { property: "og:description", content: "Post repair requests, get competitive offers from verified workers, and negotiate the best price." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "FixFlow — Find Repair Pros at Your Price" },
      { name: "twitter:description", content: "Post repair requests, get competitive offers from verified workers, and negotiate the best price." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/eb224d4d-c744-4526-a295-c2a37163e1d6/id-preview-1b26c5b6--46d179a0-03c5-46d3-9902-5ed453b63014.lovable.app-1776586766177.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/eb224d4d-c744-4526-a295-c2a37163e1d6/id-preview-1b26c5b6--46d179a0-03c5-46d3-9902-5ed453b63014.lovable.app-1776586766177.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <TooltipProvider>
      <LanguageProvider>
        <AuthProvider>
          <RoleProvider>
            <Toaster />
            <Sonner />
            <Outlet />
            <SupportChat />
          </RoleProvider>
        </AuthProvider>
      </LanguageProvider>
    </TooltipProvider>
  );
}
