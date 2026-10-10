import { BarcodeDetector as Ponyfill, prepareZXingModule } from 'barcode-detector/ponyfill';
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

// Nutzt den nativen BarcodeDetector (Chrome/Android), sonst den ZXing-WASM-Ponyfill (z. B. iOS Safari).
// Die .wasm-Datei wird mitgebündelt, damit der Scanner nicht von einem CDN abhängt.

prepareZXingModule({
  overrides: {
    locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path),
  },
});

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'];

type Detector = { detect(source: CanvasImageSource): Promise<{ rawValue: string }[]> };

export async function createDetector(): Promise<Detector> {
  const Native = (globalThis as { BarcodeDetector?: typeof Ponyfill }).BarcodeDetector;
  if (Native) {
    try {
      const supported = await Native.getSupportedFormats();
      if (supported.includes('ean_13')) return new Native({ formats: FORMATS.filter((f) => (supported as string[]).includes(f)) as never });
    } catch {
      /* fällt auf Ponyfill zurück */
    }
  }
  return new Ponyfill({ formats: FORMATS as never });
}
