import { NextResponse } from 'next/server';
import { polyRouterClient } from '@/utils/api/polyrouter-client';
import { GetAwardsListParams } from '@/types/polyrouter';

console.log('[API Route] /api/polyrouter/list-awards route module loaded');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    console.log('[API] /api/polyrouter/list-awards - Request');
    console.log('[API] Search params:', Object.fromEntries(searchParams.entries()));

    const league = searchParams.get('league') as GetAwardsListParams['league'];
    if (!league) {
      return NextResponse.json(
        { error: 'league parameter is required (nfl, nba, nhl, mlb)' },
        { status: 400 }
      );
    }

    const params: GetAwardsListParams = {
      league,
      award_type: searchParams.get('award_type') || undefined,
      season: searchParams.get('season') ? parseInt(searchParams.get('season')!) : undefined,
    };

    console.log('[API] /api/polyrouter/list-awards - Request params:', params);

    const response = await polyRouterClient.getAwardsList(params);
    
    console.log('[API] Awards list retrieved successfully');
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/polyrouter/list-awards:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch awards list', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

