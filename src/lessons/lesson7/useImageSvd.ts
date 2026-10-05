import { useCallback, useEffect, useRef, useState } from 'react';
import type { FloatMatrix } from '../../core/float';
import type { ThinSvd } from '../../core/svdLarge';
import type { SvdRequest, SvdResponse } from '../../workers/svd.worker';

export type ImageSvdState =
  | { status: 'idle' }
  | { status: 'running'; progress: number }
  | { status: 'done'; svd: ThinSvd }
  | { status: 'error'; message: string }
  | { status: 'cancelled' };

/** Results survive switching views (§12): one SVD per image matrix. */
const cache = new WeakMap<FloatMatrix, ThinSvd>();
let nextId = 1;

/**
 * F-M48, NF-13: the SVD of an image in the background worker, with progress
 * and cancellation. Starts when the image changes; a cached result comes back
 * at once.
 */
export function useImageSvd(image: FloatMatrix | null): { state: ImageSvdState; cancel: () => void; restart: () => void } {
  const [state, setState] = useState<ImageSvdState>({ status: 'idle' });
  const worker = useRef<Worker | null>(null);
  const current = useRef(0);

  const start = useCallback(() => {
    if (!image) {
      setState({ status: 'idle' });
      return;
    }
    const cached = cache.get(image);
    if (cached) {
      setState({ status: 'done', svd: cached });
      return;
    }
    if (!worker.current) worker.current = new Worker(new URL('../../workers/svd.worker.ts', import.meta.url), { type: 'module' });
    const id = nextId++;
    current.current = id;
    setState({ status: 'running', progress: 0 });
    worker.current.onmessage = (event: MessageEvent<SvdResponse>) => {
      const msg = event.data;
      if (msg.id !== current.current) return;
      if (msg.kind === 'progress') setState({ status: 'running', progress: msg.fraction });
      else if (msg.kind === 'done') {
        cache.set(image, msg.svd);
        setState({ status: 'done', svd: msg.svd });
      } else setState(/abort|cancel/i.test(msg.message) ? { status: 'cancelled' } : { status: 'error', message: msg.message });
    };
    worker.current.postMessage({ kind: 'start', id, matrix: image } satisfies SvdRequest);
  }, [image]);

  useEffect(() => {
    start();
  }, [start]);

  useEffect(() => () => worker.current?.terminate(), []);

  const cancel = useCallback(() => {
    if (current.current) worker.current?.postMessage({ kind: 'cancel', id: current.current } satisfies SvdRequest);
  }, []);

  return { state, cancel, restart: start };
}
