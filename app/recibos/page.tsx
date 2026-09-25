import { redirect } from "next/navigation";
export default async function ReceiptsPage({ searchParams }: { searchParams: Promise<{ pagamento?: string }> }) {
  const { pagamento } = await searchParams;
  redirect("/recibos/index.html" + (typeof pagamento === "string" && /^\d+$/.test(pagamento) ? `?pagamento=${pagamento}` : ""));
}
