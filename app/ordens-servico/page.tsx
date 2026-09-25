import { redirect } from "next/navigation";
export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ id?: string; mode?: string }> }) {
  const { id, mode } = await searchParams;
  const query = new URLSearchParams();
  if (typeof id === "string" && /^\d+$/.test(id)) query.set("id", id);
  if (mode === "quote") query.set("mode", "quote");
  redirect("/ordens-servico/index.html" + (query.size ? `?${query}` : ""));
}
