import { notFound } from "next/navigation";
import SeriesPageClient from "./SeriesPageClient";

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <SeriesPageClient seriesId={id} />;
}

