"use client";

import { useState, useEffect, useMemo } from "react";
import { EventCard } from "@/components/EventCard";
import { SearchBar } from "@/components/SearchBar";
import { Logo } from "@/components/Logo";
import { PlatformFilter } from "@/components/PlatformFilter";
import { useMarkets } from "@/utils/hooks/useMarkets";
import { usePlatforms } from "@/utils/hooks/usePlatforms";
import { Platform } from "@/types";

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Получаем список платформ
  const { data: platformsResponse, isLoading: isLoadingPlatforms } = usePlatforms();
  
  // Состояние для выбранных платформ
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<Platform>>(() => {
    // Загружаем из localStorage при инициализации
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("selectedPlatforms");
      if (saved) {
        try {
          const platforms = JSON.parse(saved) as Platform[];
          return new Set(platforms);
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    // По умолчанию все платформы выбраны
    return new Set<Platform>(["polymarket", "manifold", "kalshi"]);
  });

  // Сохраняем выбранные платформы в localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "selectedPlatforms",
        JSON.stringify(Array.from(selectedPlatforms))
      );
    }
  }, [selectedPlatforms]);

  // Обработчик изменения выбранных платформ
  const handlePlatformToggle = (platform: Platform, checked: boolean) => {
    const newSet = new Set(selectedPlatforms);
    if (checked) {
      newSet.add(platform);
    } else {
      newSet.delete(platform);
    }
    setSelectedPlatforms(newSet);
  };

  // Используем React Query для получения данных
  // Передаем выбранную категорию в запрос (включая "all" для агрегации)
  const { data: marketsResponse, isLoading: isLoadingReal, error: realError } = useMarkets({
    category: selectedCategory, // Передаем категорию, включая "all"
    search: searchQuery || undefined,
    platform: undefined, // Фильтр по платформе применяем на клиенте
  });

  // Извлекаем данные и источник из ответа
  const realMatches = marketsResponse?.data || [];
  const dataSourceFromAPI = marketsResponse?.source;
  
  // Определяем реальный источник данных
  // 'polyrouter' или 'database' = реальные данные
  // 'mock', 'cache', 'error' = не реальные данные
  const isRealData = dataSourceFromAPI === 'polyrouter' || dataSourceFromAPI === 'database';

  // В dev режиме НЕ используем fallback на моки - только реальные данные
  // Если данных нет или ошибка - показываем пустой список
  const rawMatches = isRealData ? realMatches : [];
  
  // Категории - это типы данных: Markets, Events, Series, Games
  // Это не поля из ответа, а разные эндпоинты
  const categories = useMemo(() => {
    return ["all", "Markets", "Events", "Series", "Games"];
  }, []);
  
  // Фильтруем матчи по платформам (категории обрабатываются на уровне API)
  const matches = useMemo(() => {
    let filtered = rawMatches || [];
    
    // Фильтр по платформам
    if (selectedPlatforms.size > 0) {
      filtered = filtered.filter(match => {
        const eventPlatforms = new Set(match.event.markets.map(m => m.platform));
        // Проверяем, есть ли хотя бы одна выбранная платформа в событии
        return Array.from(selectedPlatforms).some(platform => eventPlatforms.has(platform));
      });
    }
    
    return filtered;
  }, [rawMatches, selectedPlatforms]);
  
  // Получаем доступные платформы из ответа API или из матчей
  const availablePlatforms = useMemo(() => {
    if (platformsResponse?.data) {
      // Используем платформы из API, фильтруя только те, что есть в типах
      return platformsResponse.data
        .map(p => p.platform)
        .filter((p): p is Platform => ["polymarket", "manifold", "kalshi"].includes(p));
    }
    // Fallback: собираем платформы из матчей
    if (rawMatches && rawMatches.length > 0) {
      const platforms = new Set<Platform>();
      rawMatches.forEach(match => {
        match.event.markets.forEach(m => {
          if (["polymarket", "manifold", "kalshi"].includes(m.platform)) {
            platforms.add(m.platform);
          }
        });
      });
      return Array.from(platforms);
    }
    return ["polymarket", "manifold", "kalshi"] as Platform[];
  }, [platformsResponse, rawMatches]);
  
  const loading = isLoadingReal;
  // Правильно определяем источник данных
  const dataSource = isRealData ? 'real' : (dataSourceFromAPI === 'error' ? 'error' : 'loading');

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
          <PlatformFilter
            platforms={availablePlatforms}
            selected={selectedPlatforms}
            onChange={handlePlatformToggle}
          />
        </div>

        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-3">
            Фильтр по категориям:
          </h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
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

        {/* Индикатор источника данных */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Источник данных: <span className={`font-medium ${
              dataSource === 'real' ? 'text-green-600' : 
              dataSource === 'error' ? 'text-red-600' : 
              'text-yellow-600'
            }`}>
              {dataSource === 'real' ? 'PolyRouter API' : 
               dataSource === 'error' ? 'Ошибка загрузки' : 
               'Загрузка...'}
            </span>
            {realError && (
              <span className="ml-2 text-xs text-red-600">
                ({realError.message})
              </span>
            )}
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
            {realError && (
              <p className="text-sm text-red-600 mt-2">
                Ошибка загрузки данных: {realError.message}
              </p>
            )}
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

