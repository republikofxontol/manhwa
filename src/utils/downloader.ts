import JSZip from 'jszip';
import { getProxiedImageUrl } from './helpers';

export interface DownloadProgress {
  total: number;
  completed: number;
  status: 'fetching' | 'zipping' | 'done' | 'error';
  message: string;
}

export async function downloadChapterAsZip(
  chapterSlug: string,
  onProgress?: (p: DownloadProgress) => void
): Promise<void> {
  onProgress?.({
    total: 0,
    completed: 0,
    status: 'fetching',
    message: 'Memeriksa halaman...'
  });

  const res = await fetch(`/api/manga/chapter/${encodeURIComponent(chapterSlug)}`);
  if (!res.ok) throw new Error('Gagal memuat data chapter');
  const data = await res.json();
  if (!data.status || !data.data || !Array.isArray(data.data.images) || data.data.images.length === 0) {
    throw new Error('Gambar chapter tidak ditemukan');
  }

  const images: string[] = data.data.images;
  const zip = new JSZip();

  onProgress?.({
    total: images.length,
    completed: 0,
    status: 'fetching',
    message: `0/${images.length}`
  });

  let completed = 0;
  const queue = images.map((imgUrl, idx) => ({ imgUrl, idx }));

  const worker = async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      const { imgUrl, idx } = item;
      const proxied = getProxiedImageUrl(imgUrl);

      try {
        const imgRes = await fetch(proxied);
        if (imgRes.ok) {
          const arrayBuffer = await imgRes.arrayBuffer();
          const ext = imgUrl.split('.').pop()?.split('?')[0] || 'jpg';
          const cleanExt = ['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(ext.toLowerCase())
            ? ext
            : 'jpg';
          const padNum = String(idx + 1).padStart(3, '0');
          zip.file(`${chapterSlug}-${padNum}.${cleanExt}`, arrayBuffer);
        }
      } catch (err) {
        console.warn(`Gagal memuat halaman ${idx + 1}`, err);
      }

      completed++;
      onProgress?.({
        total: images.length,
        completed,
        status: 'fetching',
        message: `${completed}/${images.length}`
      });
    }
  };

  // 4 PEKERJA PARALEL SEKALIGUS UNTUK KECEPATAN MAKSIMAL
  await Promise.all([worker(), worker(), worker(), worker()]);

  onProgress?.({
    total: images.length,
    completed: images.length,
    status: 'zipping',
    message: 'Mengompresi .ZIP...'
  });

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      mimeType: 'application/zip',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    },
    (metadata) => {
      onProgress?.({
        total: 100,
        completed: Math.round(metadata.percent),
        status: 'zipping',
        message: `ZIP: ${Math.round(metadata.percent)}%`
      });
    }
  );

  // MEMICU PENGUNDUHAN MURNI BROWSER DENGAN MIME APPLICATION/ZIP
  const blobUrl = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `${chapterSlug}.zip`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  }, 10000);

  onProgress?.({
    total: images.length,
    completed: images.length,
    status: 'done',
    message: 'Selesai!'
  });
}
