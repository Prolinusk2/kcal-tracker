<script lang="ts">
  // Alle Icons aus dem Design an einer Stelle (24×24, Strich-Icons).
  export type IconName =
    | 'plus' | 'close' | 'arrow' | 'barcode' | 'sparkle' | 'pencil' | 'check' | 'lock'
    | 'sun' | 'bowl' | 'moon' | 'apple' | 'home' | 'book' | 'gear' | 'eye' | 'eye-off'
    | 'target' | 'trash' | 'chev-left' | 'chev-right' | 'download' | 'upload' | 'flame' | 'database';

  let { name, size = 22, stroke = 2 }: { name: IconName; size?: number; stroke?: number } = $props();
</script>

<svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={stroke} stroke-linecap="round" stroke-linejoin="round">
  {#if name === 'plus'}<path d="M12 5v14M5 12h14" />
  {:else if name === 'close'}<path d="M18 6 6 18M6 6l12 12" />
  {:else if name === 'arrow'}<path d="M5 12h14M13 6l6 6-6 6" />
  {:else if name === 'barcode'}<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10.5 8v8M14 8v8M17 8v8" />
  {:else if name === 'sparkle'}<path d="M12 3l1.8 4.6L18.5 9.5l-4.7 1.9L12 16l-1.8-4.6L5.5 9.5l4.7-1.9Z" /><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8Z" />
  {:else if name === 'pencil'}<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  {:else if name === 'check'}<path d="m5 12 5 5 9-10" />
  {:else if name === 'lock'}<rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
  {:else if name === 'sun'}<circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  {:else if name === 'bowl'}<path d="M3 11h18a9 9 0 0 1-18 0Z" /><path d="M8 7c0-1.5 1-2 1-3.5M12 7c0-1.5 1-2 1-3.5M16 7c0-1.5 1-2 1-3.5" />
  {:else if name === 'moon'}<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
  {:else if name === 'apple'}<path d="M12 8c-3-2-8-1-8 4 0 5 4 9 6 9 1 0 1.3-.5 2-.5s1 .5 2 .5c2 0 6-4 6-9 0-5-5-6-8-4Z" /><path d="M12 8c0-2 1-4 3-5" />
  {:else if name === 'home'}<path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" />
  {:else if name === 'book'}<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3Z" /><path d="M9 9h6M9 13h6" />
  {:else if name === 'gear'}<circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  {:else if name === 'eye'}<path d="M3 12s4-6 9-6 9 6 9 6-4 6-9 6-9-6-9-6Z" /><circle cx="12" cy="12" r="3" />
  {:else if name === 'eye-off'}<path d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a16 16 0 0 1-2.6 3.2M6.5 7.6C4.3 9.2 3 12 3 12s4 6 9 6c1.6 0 3-.4 4.3-1.1M9.9 10a3 3 0 0 0 4.2 4.2" />
  {:else if name === 'target'}<circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" />
  {:else if name === 'trash'}<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
  {:else if name === 'chev-left'}<path d="m15 18-6-6 6-6" />
  {:else if name === 'chev-right'}<path d="m9 18 6-6-6-6" />
  {:else if name === 'download'}<path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
  {:else if name === 'upload'}<path d="M12 15V4M7 9l5-5 5 5M5 20h14" />
  {:else if name === 'flame'}<path d="M12 21c-4 0-7-3-7-7 0-3 2-5 3-7 1 2 2 3 3 3 0-3 1-5 3-7 1 3 5 6 5 11 0 4-3 7-7 7Z" />
  {:else if name === 'database'}<ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
  {/if}
</svg>
