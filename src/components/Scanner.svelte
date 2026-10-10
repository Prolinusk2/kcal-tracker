<script lang="ts">
  import { onMount } from 'svelte';
  import { createDetector } from '../lib/scanner';
  import Icon from './Icon.svelte';

  let { ondetect, onclose }: { ondetect: (code: string) => void; onclose: () => void } = $props();

  let video: HTMLVideoElement;
  let error = $state('');
  let manualCode = $state('');

  onMount(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer = 0;

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Kamera nicht verfügbar. Die App muss über HTTPS laufen.');
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (stopped) return stream.getTracks().forEach((t) => t.stop());
        video.srcObject = stream;
        await video.play();

        const detector = await createDetector();
        const tick = async () => {
          if (stopped) return;
          if (video.readyState >= 2) {
            try {
              const codes = await detector.detect(video);
              const code = codes.find((c) => /^\d{8,14}$/.test(c.rawValue))?.rawValue ?? codes[0]?.rawValue;
              if (code && !stopped) {
                stopped = true;
                navigator.vibrate?.(40);
                ondetect(code);
                return;
              }
            } catch {
              /* einzelner Frame fehlgeschlagen → weiter */
            }
          }
          timer = window.setTimeout(tick, 200);
        };
        tick();
      } catch (e) {
        const name = (e as DOMException).name;
        error =
          name === 'NotAllowedError'
            ? 'Kein Zugriff auf die Kamera. Erlaube ihn in den Browser-Einstellungen.'
            : name === 'NotFoundError'
              ? 'Keine Kamera gefunden.'
              : (e as Error).message || 'Kamera konnte nicht gestartet werden.';
      }
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  });

  function submitManual(e: SubmitEvent) {
    e.preventDefault();
    const code = manualCode.replace(/\D/g, '');
    if (code.length >= 8) ondetect(code);
  }
</script>

<div class="scanner" role="dialog" aria-modal="true" aria-label="Barcode scannen">
  <!-- svelte-ignore a11y_media_has_caption -->
  <video bind:this={video} playsinline muted></video>

  <header>
    <button class="round" aria-label="Schließen" onclick={onclose}><Icon name="close" size={20} stroke={2.2} /></button>
    <h1>Barcode scannen</h1>
    <div style="width: 44px"></div>
  </header>

  {#if error}
    <div class="error">{error}</div>
  {:else}
    <div class="frame" aria-hidden="true"></div>
    <p class="tip">Halte den Barcode in den Rahmen</p>
  {/if}

  <form class="manual" onsubmit={submitManual}>
    <label class="sr-only" for="ean">Barcode-Nummer eintippen</label>
    <input id="ean" type="text" inputmode="numeric" placeholder="Oder Nummer eintippen" bind:value={manualCode} />
    <button aria-label="Suchen" type="submit"><Icon name="arrow" size={18} stroke={2.4} /></button>
  </form>
</div>

<style>
  .scanner {
    position: fixed;
    inset: 0;
    background: #000;
    z-index: 40;
    color: #fff;
  }
  video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  header {
    position: absolute;
    top: calc(var(--safe-top) + 16px);
    left: 20px;
    right: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  h1 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 700;
    text-shadow: 0 1px 6px rgba(0, 0, 0, 0.5);
  }
  .round {
    width: 44px;
    height: 44px;
    border-radius: 22px;
    border: 0;
    background: #fff;
    color: var(--ink);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .frame {
    position: absolute;
    left: 50%;
    top: 42%;
    width: min(78vw, 320px);
    height: 160px;
    transform: translate(-50%, -50%);
    border-radius: 22px;
    border: 3px solid #fff;
    box-shadow: 0 0 0 100vmax rgba(0, 0, 0, 0.45);
  }
  .tip {
    position: absolute;
    left: 0;
    right: 0;
    top: calc(42% + 100px);
    text-align: center;
    font-size: 14px;
    font-weight: 600;
    margin: 0;
  }
  .error {
    position: absolute;
    left: 20px;
    right: 20px;
    top: 40%;
    background: var(--surface);
    color: var(--ink);
    border-radius: 20px;
    padding: 16px;
    font-size: 14px;
    line-height: 1.4;
  }
  .manual {
    position: absolute;
    left: 20px;
    right: 20px;
    bottom: calc(var(--safe-bottom) + 24px);
    display: flex;
    gap: 8px;
    background: var(--surface);
    border-radius: 18px;
    padding: 6px 6px 6px 14px;
  }
  .manual input {
    flex-grow: 1;
    min-width: 0;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--ink);
    font-size: 16px;
  }
  .manual button {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    border: 0;
    background: var(--accent);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
