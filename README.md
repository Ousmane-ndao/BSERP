# BSERP (frontend)

## Déploiement Vercel

### Pourquoi « Chargement des documents » restait bloqué en prod

Sur **https://bserp.vercel.app**, le frontend est du **statique**. Si `axios` utilise la base **`/api`** sans rien derrière, le navigateur appelle **`bserp.vercel.app/api/...`** (Vercel), **pas** Laravel sur Render → échec silencieux ou loader infini.

Deux correctifs sont en place :

1. **`vercel.json`** — réécriture des requêtes `/api/*` vers le backend Render (`bserp-backend-latest.onrender.com`). Ainsi, même sans variable `VITE_API_URL`, les appels `/api/documents` etc. atteignent l’API.
2. **`src/services/api.ts`** — en production, on ne remplace plus l’URL Render par `/api` dans le cas « API en localhost » (ce qui envoyait tout vers Vercel par erreur).

### Variables d’environnement (recommandé)

| Variable | Exemple |
|----------|---------|
| `VITE_API_URL` | `https://bserp-backend-latest.onrender.com/api` |
| `VITE_FRONTEND_URL` | `https://bserp.vercel.app` |

Après changement des variables : **redéployer** (rebuild), les `VITE_*` sont injectées au build.

### Si tu changes d’URL backend Render

Mets à jour **`vercel.json`** (`destination` du rewrite) **ou** configure uniquement `VITE_API_URL` (appels directs cross-origin ; le CORS doit rester correct côté Laravel).

### Vérifier que la réécriture Vercel fonctionne (après déploiement)

```bash
curl -s "https://bserp.vercel.app/api/health"
```

Tu dois voir du JSON (`"status":"ok"`). Si tu reçois du HTML, le dernier déploiement n’inclut pas encore `vercel.json` ou la config Vercel écrase les rewrites — refais un déploiement depuis la branche qui contient ce fichier.
