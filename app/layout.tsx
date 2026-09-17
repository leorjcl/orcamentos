import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YGPrint | Gestão e precificação",
  description: "Precificação, custos e gestão da produção YGPrint.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
