/// <reference lib="webworker" />
import { svdLarge, type ThinSvd } from '../core/svdLarge';
import type { FloatMatrix } from '../core/float';

/** Messages to the worker: start an SVD (with an id so stale results are ignored), or cancel one. */
export type SvdRequest = { kind: 'start'; id: number; matrix: FloatMatrix } | { kind: 'cancel'; id: number };
export type SvdResponse =
  | { kind: 'progress'; id: number; fraction: number }
  | { kind: 'done'; id: number; svd: ThinSvd }
  | { kind: 'error'; id: number; message: string };

/**
 * F-M48: large SVDs off the main thread, so the page stays responsive (NF-13).
 * Cancellation is cooperative: the SVD checks between sweeps.
 */
const cancelled = new Set<number>();
const post = (message: SvdResponse) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(message);

self.onmessage = (event: MessageEvent<SvdRequest>) => {
  const message = event.data;
  if (message.kind === 'cancel') {
    cancelled.add(message.id);
    return;
  }
  const { id, matrix } = message;
  try {
    const svd = svdLarge(matrix, {
      onProgress: (fraction) => post({ kind: 'progress', id, fraction }),
      isCancelled: () => cancelled.has(id),
    });
    post({ kind: 'done', id, svd });
  } catch (e) {
    post({ kind: 'error', id, message: e instanceof Error ? e.message : String(e) });
  } finally {
    cancelled.delete(id);
  }
};
