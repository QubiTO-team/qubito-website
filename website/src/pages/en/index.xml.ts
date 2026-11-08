// The previous Hugo site also served the articles feed at the root: same address, same feed.
import type { APIContext } from 'astro';
import { articleFeed } from '../../lib/feed';

export const GET = (context: APIContext) => articleFeed('en', context);
