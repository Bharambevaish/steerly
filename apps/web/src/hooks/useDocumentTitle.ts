import { useEffect } from 'react';

const DEFAULT_TITLE = 'Steerly — Run your driving school on autopilot';

function setMeta(attr: 'name' | 'property', key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

/** Sets <title>, meta description and the matching OG tags for the current page. */
export function useDocumentTitle(title: string | null, description?: string) {
  useEffect(() => {
    const full = title ? `${title} · Steerly` : DEFAULT_TITLE;
    document.title = full;
    setMeta('property', 'og:title', full);
    if (description) {
      setMeta('name', 'description', description);
      setMeta('property', 'og:description', description);
    }
  }, [title, description]);
}
