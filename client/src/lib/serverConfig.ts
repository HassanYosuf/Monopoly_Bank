// One-file swap point: change VITE_SERVER_URL in .env (or the fallback
// below) to point the whole app at a different backend deployment.
export const SERVER_HTTP_URL: string =
  import.meta.env.VITE_SERVER_URL ?? "http://localhost:5050";

export const SERVER_WS_URL: string =
  SERVER_HTTP_URL.replace(/^http/, "ws") + "/api/events";
