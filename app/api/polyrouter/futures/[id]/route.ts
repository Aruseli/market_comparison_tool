import { NextResponse } from 'next/server';
import { polyRouterClient } from '@/utils/api/polyrouter-client';
import { GetFutureByIdParams } from '@/types/polyrouter';

console.log('[API Route] /api/polyrouter/futures/[id] route module loaded');

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    console.log(`[API] /api/polyrouter/futures/${id} - Request`);
    console.log('[API] Search params:', Object.fromEntries(searchParams.entries()));

    const queryParams: GetFutureByIdParams = {
      platform: searchParams.get('platform') || undefined,
      odds_format: (searchParams.get('odds_format') as GetFutureByIdParams['odds_format']) || undefined,
    };

    console.log('[API] /api/polyrouter/futures/[id] - Request params:', queryParams);

    const response = await polyRouterClient.getFutureById(id, queryParams);
    
    console.log('[API] Future details retrieved successfully');
    return NextResponse.json(response);
  } catch (error) {
    console.error(`Error in /api/polyrouter/futures/[id]:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch future details', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

