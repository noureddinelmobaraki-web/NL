/**
 * @license
 * Copyright (c) 2026 Noureddin El Mobaraki (NL). All Rights Reserved.
 */

export interface ShelfDefinition<T = any> {
  readonly id: string;
  readonly title: string;
  readonly badgeText?: string;
  readonly endpoint?: string;
  readonly params?: Record<string, string | number>;
  readonly anilistVars?: Record<string, unknown>;
  readonly archiveQuery?: string;
  readonly mediaType?: 'movie' | 'tv';
  readonly fetcher?: (page: number) => Promise<T[] | { items: T[]; hasMore?: boolean }>;
}

export class CatalogOrchestrator {
  private seenIds = new Set<string>();
  private seenNormalizedTitles = new Set<string>();
  private shelfPageTrackers = new Map<string, number>();

  private normalizeTitle(title: string, year?: string | number): string {
    const cleaned = (title || '')
      .toLowerCase()
      .replace(/\b(restored|remastered|hd|720p|1080p|film noir|edition)\b/gi, '')
      .replace(/[^\p{L}\p{N}]+/gu, '')
      .trim();
    const yearSuffix = year ? String(year).trim() : '';
    return yearSuffix && !cleaned.includes(yearSuffix) ? `${cleaned}_${yearSuffix}` : cleaned;
  }

  public filterUniqueItems<T extends { id: string | number; title: string; year?: string | number }>(
    sourcePrefix: string,
    items: T[],
    getKey?: (item: T) => string,
  ): T[] {
    const unique: T[] = [];
    for (const item of items) {
      const hasValidId =
        item.id !== undefined &&
        item.id !== null &&
        String(item.id).trim() !== '';
      const customKey = getKey ? getKey(item) : `${sourcePrefix}:${item.id}`;
      const normTitle = this.normalizeTitle(item.title, item.year);
      if (hasValidId && this.seenIds.has(customKey)) continue;
      if (!hasValidId && normTitle && this.seenNormalizedTitles.has(normTitle)) continue;

      if (hasValidId) {
        this.seenIds.add(customKey);
      }
      if (normTitle) {
        this.seenNormalizedTitles.add(normTitle);
      }
      unique.push(item);
    }
    return unique;
  }

  public async fetchDeduplicatedShelf<T extends { id: string | number; title: string }>(
    shelfId: string,
    sourcePrefix: string,
    fetcher: (page: number, excludeNumericIds: number[]) => Promise<{ items: T[]; hasMore: boolean }>,
    minItemsRequired = 14,
    maxBackfillPages = 3,
    getKey?: (item: T) => string,
  ): Promise<T[]> {
    const accumulated: T[] = [];
    let currentPage = (this.shelfPageTrackers.get(shelfId) ?? 0) + 1;
    let attempts = 0;

    while (accumulated.length < minItemsRequired && attempts < maxBackfillPages) {
      const excludeNumericIds = Array.from(this.seenIds)
        .filter((k) => k.startsWith(`${sourcePrefix}:`))
        .map((k) => Number(k.split(':')[1]))
        .filter((n) => Number.isFinite(n) && n > 0);

      const { items, hasMore } = await fetcher(currentPage, excludeNumericIds);
      const uniqueBatch = this.filterUniqueItems(sourcePrefix, items, getKey);
      accumulated.push(...uniqueBatch);
      this.shelfPageTrackers.set(shelfId, currentPage);

      if (!hasMore || items.length === 0) break;
      currentPage++;
      attempts++;
    }
    return accumulated;
  }

  public getNextPageForShelf(shelfId: string): number {
    const next = (this.shelfPageTrackers.get(shelfId) ?? 1) + 1;
    this.shelfPageTrackers.set(shelfId, next);
    return next;
  }

  public reset(): void {
    this.seenIds.clear();
    this.seenNormalizedTitles.clear();
    this.shelfPageTrackers.clear();
  }
}
