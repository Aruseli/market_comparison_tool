import { notFound } from "next/navigation";
import MarketPageClient from "./MarketPageClient";

export default async function MarketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <MarketPageClient marketId={id} />;
}

