import { NextResponse } from "next/server";
import eventsData from "@/data/events.json";
import { Event, Match } from "@/types";
import { calculateMatch } from "@/utils/calculations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  let events: Event[] = eventsData as Event[];

  // Фильтр по категории
  if (category && category !== "all") {
    events = events.filter((e) => e.category === category);
  }

  // Поиск по названию
  if (search) {
    const searchLower = search.toLowerCase();
    events = events.filter(
      (e) =>
        e.normalizedTitle.toLowerCase().includes(searchLower) ||
        e.tags.some((tag) => tag.toLowerCase().includes(searchLower))
    );
  }

  // Вычисляем match для каждого события
  const matches: Match[] = events.map(calculateMatch);

  // Сортируем по spread (максимальный mispricing)
  matches.sort((a, b) => b.spread - a.spread);

  return NextResponse.json(matches);
}

