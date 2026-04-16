/**
 * Route SPA de la page de connexion.
 * Éviter `/login` dans l’URL : plusieurs extensions Chrome détectent ce segment et envoient des POST
 * sur l’origine (ex. `…/login?authuser=0&format=json` → 404 sur le serveur Vite).
 */
export const LOGIN_ROUTE = '/connexion';
