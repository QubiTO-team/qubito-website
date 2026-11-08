import type { APIContext } from 'astro';
import { articleFeed } from '../../../lib/feed';

export const GET = (context: APIContext) => articleFeed('en', context);
