import { NextResponse } from "next/server";
import eventsData from "@/data/events.json";
import { Event } from "@/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const event = (eventsData as Event[]).find((e) => e.id === id);

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json(event);
}

