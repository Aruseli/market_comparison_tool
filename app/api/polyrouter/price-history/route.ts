import { NextResponse } from 'next/server';
import { polyRouterClient } from '@/utils/api/polyrouter-client';
import { GetPriceHistoryParams } from '@/types/polyrouter';

console.log('[API Route] /api/polyrouter/price-history route module loaded');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    console.log('[API] /api/polyrouter/price-history - Request');
    console.log('[API] Search params:', Object.fromEntries(searchParams.entries()));

    const marketIds = searchParams.get('market_ids');
    if (!marketIds) {
      return NextResponse.json(
        { error: 'market_ids parameter is required' },
        { status: 400 }
      );
    }

    const params: GetPriceHistoryParams = {
      market_ids: marketIds,
      start_ts: searchParams.get('start_ts') ? parseInt(searchParams.get('start_ts')!) : undefined,
      end_ts: searchParams.get('end_ts') ? parseInt(searchParams.get('end_ts')!) : undefined,
      interval: (searchParams.get('interval') as GetPriceHistoryParams['interval']) || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    };

    console.log('[API] /api/polyrouter/price-history - Request params:', params);

    const response = await polyRouterClient.getPriceHistory(params);
    
    console.log('[API] Price history retrieved successfully');
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/polyrouter/price-history:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch price history', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

