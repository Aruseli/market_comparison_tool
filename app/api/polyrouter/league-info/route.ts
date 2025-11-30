import { NextResponse } from 'next/server';
import { polyRouterClient } from '@/utils/api/polyrouter-client';
import { GetLeagueInfoParams } from '@/types/polyrouter';

console.log('[API Route] /api/polyrouter/league-info route module loaded');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    console.log('[API] /api/polyrouter/league-info - Request');
    console.log('[API] Search params:', Object.fromEntries(searchParams.entries()));

    const params: GetLeagueInfoParams = {
      league: (searchParams.get('league') as GetLeagueInfoParams['league']) || undefined,
    };

    console.log('[API] /api/polyrouter/league-info - Request params:', params);

    const response = await polyRouterClient.getLeagueInfo(params);
    
    console.log('[API] League info retrieved successfully');
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/polyrouter/league-info:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch league info', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

