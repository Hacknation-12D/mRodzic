async function fetchAsset(path: string, label: string, signature: readonly number[]) {
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error();
    const bytes = await response.arrayBuffer();
    const header = new Uint8Array(bytes);
    if (!signature.every((byte, index) => header[index] === byte)) throw new Error();
    return bytes;
  } catch {
    throw new Error(`Brakuje poprawnego pliku „${label}” (${path}).`);
  }
}

export function loadPdfAssets(file: 'ZAM' | 'ZCNA') {
  return Promise.all([
    fetchAsset(`/pdfs/${file}.pdf`, `wzór ${file}`, [37, 80, 68, 70, 45]),
    fetchAsset('/pdfs/fonts/NotoSans-Regular.ttf', 'czcionka z polskimi znakami', [0, 1, 0, 0]),
  ]);
}

export function downloadPdf(bytes: Uint8Array, file: string) {
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}
