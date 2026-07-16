# BSERP (frontend)

**Projet Vercel : `bserp`** → https://bserp.vercel.app  
**Backend : `bserp-backend`** → https://bserp-backend-latest.onrender.com/api

## Déploiement Vercel

### Pourquoi « Chargement des documents » restait bloqué en prod

Sur **https://bserp.vercel.app**, le frontend est du **statique**. Si `axios` utilise la base **`/api`** sans rien derrière, le navigateur appelle **`bserp.vercel.app/api/...`** (Vercel), **pas** Laravel sur Render → échec silencieux ou loader infini.

Deux correctifs sont en place :

1. **`vercel.json`** — réécriture des requêtes `/api/*` vers le backend Render (`bserp-backend-latest.onrender.com`). Ainsi, même sans variable `VITE_API_URL`, les appels `/api/documents` etc. atteignent l’API.
2. **`src/services/api.ts`** — sur `*.vercel.app`, appels **directs** vers Render (`https://bserp-backend-latest.onrender.com/api`) car le proxy `/api` renvoie parfois `index.html` si `vercel.json` n’est pas au dossier racine Vercel. Le CORS backend autorise `bserp.vercel.app`.

### Variables d’environnement (recommandé)

| Variable | Vercel prod |
|----------|-------------|
| `VITE_API_URL` | **Ne pas définir** |
| `VITE_API_DIRECT_URL` | Optionnel : `https://bserp-backend-latest.onrender.com/api` (défaut dans le code) |
| `VITE_FRONTEND_URL` | `https://bserp.vercel.app` |

**Root Directory Vercel** : doit être `BSERP` (là où se trouve `vercel.json`).

Après changement : **redéployer** le frontend.

### Si tu changes d’URL backend Render

Mets à jour **`vercel.json`** (`destination` du rewrite). Ne pas compter sur `VITE_API_URL` sur Vercel.

### Vérifier que la réécriture Vercel fonctionne (après déploiement)

```bash
curl -s "https://bserp.vercel.app/api/health"
```

Tu dois voir du JSON (`"status":"ok"`). Si tu reçois du HTML, le dernier déploiement n’inclut pas encore `vercel.json` ou la config Vercel écrase les rewrites — refais un déploiement depuis la branche qui contient ce fichier.

### Téléchargement de documents (prod)

- Le frontend appelle **`https://bserp-backend-latest.onrender.com/api/documents/{id}/download`** (voir la console : `[BSERP] API baseURL = …`).
- Si erreur **fichier introuvable** : le fichier a été perdu sur Render → **ré-uploader** le document.
- Sur Render (service `bserp-backend`) : disque **`/app/storage`** + variable `FILESYSTEM_LOCAL_ROOT=/app/storage/app/private`.
