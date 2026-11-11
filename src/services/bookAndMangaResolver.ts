export async function searchGutendexBooks(query: string, lang = 'en,ar,fr') {
  const url = `https://gutendex.com/books?search=${encodeURIComponent(query)}&languages=${encodeURIComponent(lang)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).map((book: any) => ({
    id: `gutenberg-${book.id}`,
    title: book.title,
    author: book.authors?.[0]?.name || 'Unknown Author',
    cover: book.formats?.['image/jpeg'] || '',
    epubUrl: book.formats?.['application/epub+zip'] || null,
    htmlUrl: book.formats?.['text/html'] || null,
    txtUrl: book.formats?.['text/plain; charset=utf-8'] || null,
    downloads: book.download_count || 0,
  }));
}

export async function fetchMangaChapterImages(chapterId: string): Promise<string[]> {
  if (!chapterId) return [];
  const res = await fetch(`https://api.mangadex.org/at-home/server/${encodeURIComponent(chapterId)}`);
  if (!res.ok) return [];
  const data = await res.json();
  const baseUrl = data.baseUrl;
  const hash = data.chapter?.hash;
  const files: string[] = data.chapter?.dataSaver || [];
  if (!baseUrl || !hash) return [];
  return files.map((file) => `${baseUrl}/data-saver/${hash}/${file}`);
}
