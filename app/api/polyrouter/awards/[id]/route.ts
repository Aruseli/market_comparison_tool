import { NextResponse } from 'next/server';
import { polyRouterClient } from '@/utils/api/polyrouter-client';
import { GetAwardByIdParams } from '@/types/polyrouter';

console.log('[API Route] /api/polyrouter/awards/[id] route module loaded');

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    console.log(`[API] /api/polyrouter/awards/${id} - Request`);
    console.log('[API] Search params:', Object.fromEntries(searchParams.entries()));

    const queryParams: GetAwardByIdParams = {
      platform: searchParams.get('platform') || undefined,
      odds_format: (searchParams.get('odds_format') as GetAwardByIdParams['odds_format']) || undefined,
    };

    console.log('[API] /api/polyrouter/awards/[id] - Request params:', queryParams);

    const response = await polyRouterClient.getAwardById(id, queryParams);
    
    console.log('[API] Award details retrieved successfully');
    return NextResponse.json(response);
  } catch (error) {
    console.error(`Error in /api/polyrouter/awards/[id]:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch award details', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

