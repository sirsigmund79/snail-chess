/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** PostHog project API key (phc_…). Analytics is off when unset. */
  readonly VITE_POSTHOG_KEY?: string;
  /** PostHog ingestion host, e.g. https://us.i.posthog.com or https://eu.i.posthog.com. */
  readonly VITE_POSTHOG_HOST?: string;
  /** Set to 1 to log PostHog activity in the browser console. */
  readonly VITE_POSTHOG_DEBUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
