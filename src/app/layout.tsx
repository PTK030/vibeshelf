import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { BRAND } from "@/lib/brand";
import "./globals.css";

/*
 * Spotify's own faces (Spotify Mix, custom Circular) are not licensable and
 * their partner guidelines tell integrators to use a platform sans-serif.
 * Figtree is a geometric grotesque built as a free Circular alternative.
 */
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${figtree.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
