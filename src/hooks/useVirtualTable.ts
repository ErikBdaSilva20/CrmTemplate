import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface UseVirtualTableOptions {
  count: number;
  estimateRowHeight?: number;
  overscan?: number;
}

export interface VirtualTableRow {
  index: number;
  key: React.Key;
}

export interface UseVirtualTableResult {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  rows: VirtualTableRow[];
  paddingTop: number;
  paddingBottom: number;
}

// Virtualização de tabelas grandes (windowing): em vez de renderizar toda
// `count` linhas, só as visíveis no viewport (+ overscan) viram <tr> reais —
// o resto vira duas linhas "espaçadoras" (paddingTop/paddingBottom) que
// preservam a altura total do scroll. Compartilhado entre ContactsTable e
// DealsList (Masia Clone-Template Audit Framework §5/§6.2 — evita renderizar
// centenas/milhares de linhas de uma vez; 100% client-side, não depende do
// gateway).
export function useVirtualTable({
  count,
  estimateRowHeight = 53,
  overscan = 8,
}: UseVirtualTableOptions): UseVirtualTableResult {
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateRowHeight,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0 ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end : 0;

  return {
    scrollRef,
    rows: virtualItems.map((v) => ({ index: v.index, key: v.key })),
    paddingTop,
    paddingBottom,
  };
}
