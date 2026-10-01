import { createContext, type RefObject } from 'react';

/**
 * A div over each canvas that React renders empty and drei's <Html> labels
 * portal into. Without it, drei appends label nodes into a container React
 * also manages, and unmounting the canvas throws "removeChild … not a child".
 */
export const LabelLayerContext = createContext<RefObject<HTMLDivElement | null> | null>(null);
