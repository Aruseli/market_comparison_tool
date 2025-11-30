"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Event, Platform } from "@/types";
import { ComparisonTable } from "@/components/ComparisonTable";
import { PlatformFilter } from "@/components/PlatformFilter";
import { formatProbability, formatSpread, formatDate } from "@/utils/calculations";
import { useQuery } from "@tanstack/react-query";

interface EventPageClientProps {
  eventId: string;
  event?: Event; // Опционально для обратной совместимости
}

export default function EventPageClient({ eventId, event: initialEvent }: EventPageClientProps) {
  const router = useRouter();
  const [visiblePlatforms, setVisiblePlatforms] = useState<Set<Platform>>(
    () => new Set(["polymarket", "manifold", "kalshi"])
  );
  const [useRealData, setUseRealData] = useState(true);

  // Используем React Query для получения данных события с real-time обновлением
  const { data: apiResponse, isLoading, error } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/polyrouter/events/${eventId}?with_nested_markets=true`);
      if (!response.ok) {
        throw new Error('Failed to fetch event');
      }
      return response.json();
    },
    staleTime: 30000,
    refetchInterval: 30000,
    enabled: useRealData,
  });

  // Преобразуем данные из API в формат Event
  const apiMatch = apiResponse?.data;
  
  // Fallback на initialEvent если есть
  const fallbackEvent = initialEvent;
  
  // Определяем, какие данные использовать
  let event: Event | undefined = fallbackEvent;
  let dataSource: 'real' | 'mock' = 'mock';
  
  if (useRealData && apiMatch && apiMatch.event) {
    // Преобразуем Match в Event
    event = {
      id: apiMatch.eventId || apiMatch.event.id || eventId,
      normalizedTitle: apiMatch.event.normalizedTitle || apiMatch.event.title || 'Событие',
      description: apiMatch.event.description,
      category: apiMatch.event.category || 'Другое',
      tags: apiMatch.event.tags || [],
      markets: apiMatch.event.markets || [],
    };
    dataSource = 'real';
  } else if (fallbackEvent) {
    event = fallbackEvent;
    dataSource = 'mock';
  }

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

  // Проверяем наличие event и markets перед использованием
  if (!event || !event.markets || event.markets.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Событие не найдено или не содержит рынков</p>
          <button
            onClick={() => router.push("/")}
            className="text-teal-600 hover:text-teal-900"
          >
            ← Вернуться к списку событий
          </button>
        </div>
      </div>
    );
  }

  const probabilities = event.markets.map((m) => m.probability).filter(p => p !== undefined && p > 0);
  const minProb = probabilities.length > 0 ? Math.min(...probabilities) : 0;
  const maxProb = probabilities.length > 0 ? Math.max(...probabilities) : 0;
  const spread = maxProb - minProb;

  const availablePlatforms = Array.from(
    new Set(event.markets.map((m) => m.platform))
  ) as Platform[];

  if (isLoading && useRealData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <p className="mt-2 text-gray-600">Загрузка данных события...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="text-teal-600 hover:text-teal-900 flex items-center"
          >
            ← Назад к списку событий
          </button>
          <div className="text-sm text-gray-500">
            Источник: <span className={`font-medium ${dataSource === 'real' ? 'text-green-600' : 'text-orange-600'}`}>
              {dataSource === 'real' ? 'PolyRouter API' : 'Моковые данные'}
            </span>
          </div>
        </div>

        {error && useRealData && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              Ошибка загрузки реальных данных: {error.message}. Используются моковые данные.
            </p>
            <button
              onClick={() => setUseRealData(false)}
              className="mt-2 text-xs text-yellow-600 hover:text-yellow-800"
            >
              Отключить реальные данные
            </button>
          </div>
        )}

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

