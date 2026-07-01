export const publicUrl = (host: string, key: string): string => {
  const cleanHost = host.replace(/\/+$/, '');
  const base =
    cleanHost.startsWith('http://') || cleanHost.startsWith('https://')
      ? cleanHost
      : `https://${cleanHost}`;
  return `${base}/${key}`;
};

export const contentTypeForFile = (fileName: string): string | undefined => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (!ext) return undefined;

  return {
    avif: 'image/avif',
    gif: 'image/gif',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    svg: 'image/svg+xml',
    webp: 'image/webp',
  }[ext];
};
