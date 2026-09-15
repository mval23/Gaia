export interface Span {
  id: string;
  startMin: number;
  durationMin: number;
}

export interface Placement {
  lane: number;
  lanes: number;
}

/**
 * Assigns overlapping blocks to side-by-side lanes, Apple Calendar style.
 * Blocks in the same overlap cluster share the same lane count.
 */
export function layoutLanes(spans: Span[]): Map<string, Placement> {
  const sorted = [...spans].sort((a, b) => a.startMin - b.startMin || b.durationMin - a.durationMin);
  const result = new Map<string, Placement>();
  let cluster: { id: string; lane: number }[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;

  const flush = () => {
    const lanes = laneEnds.length || 1;
    for (const item of cluster) result.set(item.id, { lane: item.lane, lanes });
    cluster = [];
    laneEnds = [];
  };

  for (const s of sorted) {
    const end = s.startMin + s.durationMin;
    if (s.startMin >= clusterEnd && cluster.length) flush();
    let lane = laneEnds.findIndex((e) => e <= s.startMin);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    cluster.push({ id: s.id, lane });
    clusterEnd = Math.max(cluster.length === 1 ? end : clusterEnd, end);
  }
  flush();
  return result;
}

/** First free start (snapped) of `duration` minutes at or after `from`, within [from, until]. */
export function findFreeSlot(
  busy: { startMin: number; durationMin: number }[],
  duration: number,
  from: number,
  until: number,
  step = 15,
): number | null {
  const sorted = [...busy].sort((a, b) => a.startMin - b.startMin);
  for (let t = Math.ceil(from / step) * step; t + duration <= until; t += step) {
    const clash = sorted.some((b) => t < b.startMin + b.durationMin && b.startMin < t + duration);
    if (!clash) return t;
  }
  return null;
}
