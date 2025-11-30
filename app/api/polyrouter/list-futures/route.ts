import { NextResponse } from 'next/server';
import { polyRouterClient } from '@/utils/api/polyrouter-client';
import { GetFuturesListParams } from '@/types/polyrouter';

console.log('[API Route] /api/polyrouter/list-futures route module loaded');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    console.log('[API] /api/polyrouter/list-futures - Request');
    console.log('[API] Search params:', Object.fromEntries(searchParams.entries()));

    const league = searchParams.get('league') as GetFuturesListParams['league'];
    if (!league) {
      return NextResponse.json(
        { error: 'league parameter is required (nfl, nba, nhl, mlb)' },
        { status: 400 }
      );
    }

    const params: GetFuturesListParams = {
      league,
      future_type: (searchParams.get('future_type') as GetFuturesListParams['future_type']) || undefined,
      season: searchParams.get('season') ? parseInt(searchParams.get('season')!) : undefined,
    };

    console.log('[API] /api/polyrouter/list-futures - Request params:', params);

    const response = await polyRouterClient.getFuturesList(params);
    
    console.log('[API] Futures list retrieved successfully');
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/polyrouter/list-futures:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch futures list', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

