/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the API, e.g. https://tender-tracker-api.onrender.com/api. Unset in development (the Vite proxy is used). */
  readonly VITE_API_BASE?: string;
}
