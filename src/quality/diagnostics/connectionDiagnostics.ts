export interface ConnectionDiagnosticInput {
  surface: 'home' | 'launcher';
  nodeIds: readonly string[];
  connectionIds: readonly string[];
}

export function reportConnectionDiagnostics(input: ConnectionDiagnosticInput): void {
  if (!import.meta.env.DEV) return;
  const duplicates = input.connectionIds.filter(
    (id, index, all) => all.indexOf(id) !== index,
  );
  const emptyNodes = input.nodeIds.filter((id) => id.trim().length === 0);
  if (duplicates.length === 0 && emptyNodes.length === 0) return;
  console.warn(`[${input.surface} connections] visual integrity warning`, {
    duplicateConnectionIds: Array.from(new Set(duplicates)),
    emptyNodeIds: emptyNodes,
  });
}
