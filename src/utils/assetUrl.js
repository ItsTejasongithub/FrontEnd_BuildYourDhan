// Small helper to build URLs that work in dev and production (with subpath)
// Uses Vite's import.meta.env.BASE_URL
export const assetUrl = (relativePath) => {
  const base = (import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '/';
  const clean = String(relativePath || '').replace(/^\/+/, '');
  return (base + clean).replace(/\/+/g, '/');
};

export const dataUrl = (pathInData) => {
  const clean = String(pathInData || '').replace(/^\/+/, '').replace(/^data\//, '');
  return assetUrl(`data/${clean}`);
};


