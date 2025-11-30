import { notFound } from "next/navigation";
import GamePageClient from "./GamePageClient";

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <GamePageClient gameId={id} />;
}

