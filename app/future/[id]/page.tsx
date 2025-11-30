import { notFound } from "next/navigation";
import FuturePageClient from "./FuturePageClient";

export default async function FuturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <FuturePageClient futureId={id} />;
}

