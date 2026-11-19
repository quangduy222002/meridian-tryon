/**
 * Claude from the host page. When the site runs as a claude.ai Artifact, the viewer's own Claude account can answer
 * (the `sample` capability): no API key, nothing billed to the site. Elsewhere `window.claude` is missing and this
 * resolves null, so callers fall back to an API key.
 */

export interface HostSample {
  json<T = unknown>(
    input: string,
    options?: { modelTier?: 'quick' | 'default' | 'complex'; signal?: AbortSignal; images?: Blob[] },
  ): Promise<T>;
}

interface HostError {
  code?: string;
}

const uses = new Map<string, Promise<unknown>>();
/** A host capability's namespace, or null outside a claude.ai Artifact (or when this view cannot run it). */
function hostUse<T>(name: string): Promise<T | null> {
  let p = uses.get(name);
  if (!p) {
    p = (async () => {
      const c = (window as { claude?: { use?: (name: string) => Promise<unknown> } }).claude;
      if (typeof c?.use !== 'function') return null;
      try {
        return (await c.use(name)) ?? null;
      } catch {
        return null;
      }
    })();
    uses.set(name, p);
  }
  return p as Promise<T | null>;
}

export const hostClaude = () => hostUse<HostSample>('sample');

interface HostDownloads {
  save(req: { filename: string; data: string | Blob }): Promise<{ status: 'saved' | 'delivered' }>;
}
export const hostDownloads = () => hostUse<HostDownloads>('downloads');

/**
 * Saves a file for the visitor: through the host's download prompt inside a claude.ai Artifact (where a plain
 * download link does nothing), else with a download link. Resolves false when the visitor declined.
 */
export async function saveFile(filename: string, data: Blob | string): Promise<boolean> {
  const host = await hostDownloads();
  if (host) {
    try {
      await host.save({ filename, data });
      return true;
    } catch (err) {
      if ((err as HostError | null)?.code === 'declined') return false;
      throw new Error('This file could not be saved here.', { cause: err });
    }
  }
  const blob = typeof data === 'string' ? new Blob([data], { type: 'text/plain' }) : data;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return true;
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
    case 'images_unavailable':
    case 'image_rejected':
      return 'Pictures cannot be sent to Claude from this page here. Open it in claude.ai, or add an API key.';
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
