/**
 * Claude from the host page. When the site runs as a claude.ai Artifact, the viewer's own Claude account can answer
 * (the `sample` capability): no API key, nothing billed to the site. Elsewhere `window.claude` is missing and this
 * resolves null, so callers fall back to an API key.
 */

export interface HostSample {
  json<T = unknown>(
    input: string,
    options?: { modelTier?: 'quick' | 'default' | 'complex'; signal?: AbortSignal },
  ): Promise<T>;
}

interface HostError {
  code?: string;
}

let pending: Promise<HostSample | null> | null = null;

export function hostClaude(): Promise<HostSample | null> {
  pending ??= (async () => {
    const c = (window as { claude?: { use?: (name: string) => Promise<unknown> } }).claude;
    if (typeof c?.use !== 'function') return null;
    try {
      return ((await c.use('sample')) as HostSample | null) ?? null;
    } catch {
      return null;
    }
  })();
  return pending;
}

/** Viewer-facing message for a failed host call, by its error code. */
export function hostFailure(err: unknown): string {
  const code = (err as HostError | null)?.code ?? '';
  switch (code) {
    case 'not_granted':
    case 'sampling_disabled':
    case 'not_declared':
    case 'capability_disabled':
    case 'capability_removed':
      return 'Claude is not allowed for this page. You can allow it from the artifact’s permissions.';
    case 'rate_limited':
      return 'Claude is busy or your usage limit is reached — try again a little later.';
    case 'session_expired':
      return 'Your claude.ai session expired. Sign in again, then retry.';
    case 'refused':
      return 'Claude declined this request. Try rephrasing it.';
    case 'invalid_json':
    case 'empty_completion':
      return 'Claude returned an unreadable layout. Try again.';
    case 'cancelled':
      return 'Stopped.';
    default:
      return 'Could not reach Claude. Try again.';
  }
}
