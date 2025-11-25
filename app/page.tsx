"use client";

import { useEffect, useState } from "react";
import { Match } from "@/types";
import { EventCard } from "@/components/EventCard";
import { SearchBar } from "@/components/SearchBar";
import { Logo } from "@/components/Logo";
import { getMatches } from "@/utils/events";

const CATEGORIES = [
  "all",
  "Политика",
  "Экономика",
  "Криптовалюты",
  "Финансы",
  "Технологии",
  "Спорт",
];

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchEvents();
  }, [selectedCategory, searchQuery]);

  const fetchEvents = () => {
    setLoading(true);
    try {
      const category = selectedCategory !== "all" ? selectedCategory : undefined;
      const search = searchQuery || undefined;
      const data = getMatches(category, search);
      setMatches(data);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex flex-row items-center space-x-2 mb-2">
            <Logo />
            <h1 className="text-3xl font-bold text-gray-900">
              Market Comparison Tool
            </h1>
          </div>
          <p className="text-gray-600">
            Сравнение рынков предсказаний на Polymarket, Manifold и Kalshi
          </p>
        </header>

        <div className="mb-6">
          <SearchBar onSearch={setSearchQuery} value={searchQuery} />
        </div>

        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-3">
            Фильтр по категориям:
          </h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-900 hover:text-white transition-all duration-300 ${
                  selectedCategory === category
                    ? "bg-teal-600 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {category === "all" ? "Все" : category}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full size-8 border-b-2 border-teal-600"></div>
            <p className="mt-2 text-gray-600">Загрузка событий...</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">События не найдены</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matches.map((match) => (
              <EventCard key={match.eventId} match={match} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

