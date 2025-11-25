import { getEventById, getEvents } from "@/utils/events";
import { notFound } from "next/navigation";
import EventPageClient from "./EventPageClient";

// Генерация статических параметров для статического экспорта
export function generateStaticParams() {
  const events = getEvents();
  return events.map((event) => ({
    id: event.id,
  }));
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = getEventById(id);

  if (!event) {
    notFound();
  }

  return <EventPageClient event={event} />;
}

