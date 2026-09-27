import type { Metadata } from "next";
import Script from "next/script";
import { site } from "@/site.config";
import "./globals.css";

export const metadata: Metadata = {
  title: site.name,
  description: site.tagline,
};

const widgetAgent = process.env.NEXT_PUBLIC_ZETRA_WIDGET_AGENT_ID;
const widgetSrc = process.env.NEXT_PUBLIC_ZETRA_WIDGET_SRC ?? "https://cdn.zetra.ai/embed.js";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        {widgetAgent && <Script src={widgetSrc} data-agent-id={widgetAgent} strategy="lazyOnload" />}
      </body>
    </html>
  );
}
