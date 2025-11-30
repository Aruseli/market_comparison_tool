import { NextResponse } from 'next/server';
import { polyRouterClient } from '@/utils/api/polyrouter-client';
import { GetTradesParams } from '@/types/polyrouter';

console.log('[API Route] /api/polyrouter/trades route module loaded');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    console.log('[API] /api/polyrouter/trades - Request');
    console.log('[API] Search params:', Object.fromEntries(searchParams.entries()));

    const marketId = searchParams.get('market_id');
    if (!marketId) {
      return NextResponse.json(
        { error: 'market_id parameter is required' },
        { status: 400 }
      );
    }

    const params: GetTradesParams = {
      market_id: marketId,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      cursor: searchParams.get('cursor') || undefined,
    };

    console.log('[API] /api/polyrouter/trades - Request params:', params);

    const response = await polyRouterClient.getTrades(params);
    
    console.log('[API] Trades retrieved successfully');
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/polyrouter/trades:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch trades', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

