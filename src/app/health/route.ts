/**
 * Standalone health check endpoint.
 * Returns 200 OK immediately — does NOT depend on the Express backend.
 * Used by Railway (and other platforms) for deployment health checks.
 */
export async function GET() {
  return new Response('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });
}
