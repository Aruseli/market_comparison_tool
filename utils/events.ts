import eventsData from "@/data/events.json";
import { Event, Match } from "@/types";
import { calculateMatch } from "@/utils/calculations";

export function getEvents(): Event[] {
  return eventsData as Event[];
}

export function getEventById(id: string): Event | undefined {
  const events = getEvents();
  return events.find((e) => e.id === id);
}

export function filterEvents(
  events: Event[],
  category?: string,
  search?: string
): Event[] {
  let filtered = [...events];

  // Фильтр по категории
  if (category && category !== "all") {
    filtered = filtered.filter((e) => e.category === category);
  }

  // Поиск по названию
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.normalizedTitle.toLowerCase().includes(searchLower) ||
        e.tags.some((tag) => tag.toLowerCase().includes(searchLower))
    );
  }

  return filtered;
}

export function getMatches(
  category?: string,
  search?: string
): Match[] {
  const events = getEvents();
  const filtered = filterEvents(events, category, search);
  const matches: Match[] = filtered.map(calculateMatch);
  
  // Сортируем по spread (максимальный mispricing)
  matches.sort((a, b) => b.spread - a.spread);
  
  return matches;
}

