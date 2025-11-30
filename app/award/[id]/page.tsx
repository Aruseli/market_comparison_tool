import { notFound } from "next/navigation";
import AwardPageClient from "./AwardPageClient";

export default async function AwardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AwardPageClient awardId={id} />;
}

