import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { StoreGate } from "@/components/store-gate";
import { Shell } from "@/components/shell";
import appCss from "../styles.css?url";

const APP_NAME = "Idea Cartographer";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "A desk for mapping one idea through seven passes — and logging how you failed to explain it.",
      },
      { name: "theme-color", content: "#0e0d0c" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  component: () => (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-bg text-fg">
        <StoreGate>
          <Shell>
            <Outlet />
          </Shell>
        </StoreGate>
        <Scripts />
      </body>
    </html>
  ),
});
