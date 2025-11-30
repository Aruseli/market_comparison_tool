import EventPageClient from "./EventPageClient";

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Передаем только ID, EventPageClient сам загрузит данные через API
  return <EventPageClient eventId={id} />;
}

