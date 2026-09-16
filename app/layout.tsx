import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YGPrint Orçamentos",
  description: "Painel de clientes, pedidos e orçamentos da YGPrint.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
