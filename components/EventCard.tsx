"use client";

import { Match } from "@/types";
import { formatProbability, formatSpread } from "@/utils/calculations";
import Link from "next/link";

interface EventCardProps {
  match: Match;
}

export const EventCard = ({ match }: EventCardProps) => {
  const { event, minProbability, maxProbability, spread, platformsCount, dataType } =
    match;

  // Определяем URL на основе типа данных
  const getDetailUrl = () => {
    const id = event.id;
    switch (dataType) {
      case 'market':
        return `/market/${id}`;
      case 'event':
        return `/event/${id}`;
      case 'series':
        return `/series/${id}`;
      case 'game':
        return `/game/${id}`;
      case 'award':
        return `/award/${id}`;
      case 'future':
        return `/future/${id}`;
      default:
        // По умолчанию используем /event для обратной совместимости
        return `/event/${id}`;
    }
  };

  // Проверяем наличие markets
  if (!event.markets || event.markets.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {event.normalizedTitle}
        </h3>
        <p className="text-sm text-gray-500">Нет доступных рынков</p>
      </div>
    );
  }

  // Собираем дополнительные данные из всех рынков
  const hasPriceChanges = event.markets.some(m => m.price_24h_changes || m.price_7d_changes);
  const hasFees = event.markets.some(m => m.fee_rate || m.trading_fee || m.withdrawal_fee);
  const hasActivity = event.markets.some(m => m.unique_traders || m.open_interest);
  const totalVolume24h = event.markets.reduce((sum, m) => sum + (m.volume_24h || 0), 0);
  const totalUniqueTraders = event.markets.reduce((sum, m) => sum + (m.unique_traders || 0), 0);
  
  // Для Games собираем дополнительную информацию
  const isGame = dataType === 'game';
  const gameMarkets = isGame ? event.markets : [];
  const hasGameData = isGame && gameMarkets.length > 0;

  // Получаем изменения цен за 24ч и 7д (берем из первого рынка с данными)
  // Поддерживаем разные структуры данных из API
  const getPriceChange = (changes?: any): number | undefined => {
    if (!changes) return undefined;
    // Пробуем разные варианты структуры
    if (changes.yes?.percent !== undefined) return changes.yes.percent;
    if (changes.yes?.price !== undefined) return changes.yes.price * 100; // Если в формате 0-1
    if (typeof changes === 'number') return changes;
    if (changes.percent !== undefined) return changes.percent;
    return undefined;
  };

  const priceChange24h = event.markets
    .map(m => getPriceChange(m.price_24h_changes))
    .find(p => p !== undefined);
  const priceChange7d = event.markets
    .map(m => getPriceChange(m.price_7d_changes))
    .find(p => p !== undefined);

  return (
    <Link href={getDetailUrl()}>
      <div 
        className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {event.normalizedTitle}
        </h3>
        <div className="flex items-center space-2 mb-3">
          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
            {event.category}
          </span>
          <span className="text-xs text-gray-500">
            {platformsCount} платформ
          </span>
        </div>
        {/* Для Games показываем специальные поля */}
        {isGame && (
          <div className="mb-3 text-xs text-gray-600">
            {event.description && (
              <p className="mb-1">{event.description}</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <div className="flex space-x-4">
            <div>
              <span className="text-xs text-gray-500 mr-1">Мин:</span>
              <span className="text-sm font-medium text-red-600">
                {formatProbability(minProbability)}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-500 mr-1">Макс:</span>
              <span className="text-sm font-medium text-teal-600">
                {formatProbability(maxProbability)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-500 mr-1">Spread:</span>
            <span className="text-sm font-bold text-orange-600">
              {formatSpread(spread)}
            </span>
          </div>
        </div>
        
        {/* Дополнительные данные из API - показываем всегда если есть данные */}
        <div className="border-t border-gray-100 pt-3 mt-3 space-y-2">
          {/* Изменения цен */}
          {(priceChange24h !== undefined || priceChange7d !== undefined) && (
            <div className="flex items-center space-x-4 text-xs">
              {priceChange24h !== undefined && (
                <div>
                  <span className="text-gray-500">24ч:</span>
                  <span className={`ml-1 font-medium ${
                    priceChange24h > 0 ? 'text-green-600' : priceChange24h < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {priceChange24h > 0 ? '+' : ''}{priceChange24h.toFixed(1)}%
                  </span>
                </div>
              )}
              {priceChange7d !== undefined && (
                <div>
                  <span className="text-gray-500">7д:</span>
                  <span className={`ml-1 font-medium ${
                    priceChange7d > 0 ? 'text-green-600' : priceChange7d < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {priceChange7d > 0 ? '+' : ''}{priceChange7d.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* Активность торговли */}
          {(totalVolume24h > 0 || totalUniqueTraders > 0) && (
            <div className="flex items-center space-x-4 text-xs text-gray-600">
              {totalVolume24h > 0 && (
                <div>
                  <span className="text-gray-500">Объем 24ч:</span>
                  <span className="ml-1 font-medium">
                    {totalVolume24h >= 1000000 
                      ? `$${(totalVolume24h / 1000000).toFixed(2)}M`
                      : totalVolume24h >= 1000
                      ? `$${(totalVolume24h / 1000).toFixed(1)}k`
                      : `$${totalVolume24h.toFixed(0)}`}
                  </span>
                </div>
              )}
              {totalUniqueTraders > 0 && (
                <div>
                  <span className="text-gray-500">Трейдеры:</span>
                  <span className="ml-1 font-medium">
                    {totalUniqueTraders}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* Комиссии (показываем среднюю) */}
          {hasFees && (
            <div className="text-xs text-gray-500">
              {(() => {
                const fees = event.markets
                  .map(m => m.fee_rate || m.trading_fee)
                  .filter((f): f is number => f !== undefined && f > 0);
                if (fees.length > 0) {
                  const avgFee = fees.reduce((sum, f) => sum + f, 0) / fees.length;
                  return `Комиссия: ${(avgFee * 100).toFixed(2)}%`;
                }
                return null;
              })()}
            </div>
          )}

          {/* Для Games показываем количество outcomes */}
          {isGame && gameMarkets.length > 0 && (
            <div className="text-xs text-gray-500">
              Ставок: {gameMarkets.length}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

