"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Event, Platform } from "@/types";
import { ComparisonTable } from "@/components/ComparisonTable";
import { PlatformFilter } from "@/components/PlatformFilter";
import { formatProbability, formatSpread, formatDate } from "@/utils/calculations";

interface EventPageClientProps {
  event: Event;
}

export default function EventPageClient({ event }: EventPageClientProps) {
  const router = useRouter();
  const [visiblePlatforms, setVisiblePlatforms] = useState<Set<Platform>>(
    () => new Set(["polymarket", "manifold", "kalshi"])
  );

  useEffect(() => {
    loadPlatformPreferences();
  }, []);

  const loadPlatformPreferences = () => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("visiblePlatforms");
      if (saved) {
        try {
          const platforms = JSON.parse(saved) as Platform[];
          setVisiblePlatforms(new Set(platforms));
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  };

  const handlePlatformToggle = (platform: Platform, checked: boolean) => {
    const newSet = new Set(visiblePlatforms);
    if (checked) {
      newSet.add(platform);
    } else {
      newSet.delete(platform);
    }
    setVisiblePlatforms(newSet);

    // Сохраняем в localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "visiblePlatforms",
        JSON.stringify(Array.from(newSet))
      );
    }
  };

  const probabilities = event.markets.map((m) => m.probability);
  const minProb = Math.min(...probabilities);
  const maxProb = Math.max(...probabilities);
  const spread = maxProb - minProb;

  const availablePlatforms = Array.from(
    new Set(event.markets.map((m) => m.platform))
  ) as Platform[];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => router.push("/")}
          className="text-teal-600 hover:text-teal-900 mb-4 flex items-center"
        >
          ← Назад к списку событий
        </button>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {event.normalizedTitle}
          </h1>
          {event.description && (
            <p className="text-gray-600 mb-4">{event.description}</p>
          )}
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-gray-500 mr-2">Категория:</span>
              <span className="font-medium">{event.category}</span>
            </div>
            {event.resolutionDate && (
              <div>
                <span className="text-gray-500 mr-2">Дата разрешения:</span>
                <span className="font-medium">{formatDate(event.resolutionDate)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Резюме mispricing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Максимальная вероятность</div>
              <div className="text-2xl font-bold text-green-600">
                {formatProbability(maxProb)}
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Минимальная вероятность</div>
              <div className="text-2xl font-bold text-red-600">
                {formatProbability(minProb)}
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Spread</div>
              <div className="text-2xl font-bold text-orange-600">
                {formatSpread(spread)}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <PlatformFilter
            platforms={availablePlatforms}
            selected={visiblePlatforms}
            onChange={handlePlatformToggle}
          />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Сравнение рынков
          </h2>
          <ComparisonTable event={event} visiblePlatforms={visiblePlatforms} />
        </div>
      </div>
    </div>
  );
}

