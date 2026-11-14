import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { PageMeta, generateMetaTags, getOrganizationSchema } from '@/lib/seo';

interface SEOHeadProps {
  meta: PageMeta;
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Per-page head manager. The static tags in index.html are the home-page
 * defaults; this component UPDATES those same tags in place (no duplicates)
 * for the current route, and injects page-level JSON-LD via Helmet.
 */
export function SEOHead({ meta, structuredData }: SEOHeadProps) {
  const tags = generateMetaTags(meta);
  const canonical = meta.canonical || 'https://www.shadowtalk-ai.com/';

  useEffect(() => {
    const upsert = (
      selector: string,
      make: () => HTMLElement,
      apply: (el: HTMLElement) => void,
    ) => {
      let el = document.head.querySelector(selector) as HTMLElement | null;
      if (!el) {
        el = make();
        document.head.appendChild(el);
      }
      apply(el);
    };

    const metaSel = (attr: 'name' | 'property', key: string) =>
      `meta[${attr}="${key}"]`;

    const setMeta = (attr: 'name' | 'property', key: string, content: string) =>
      upsert(
        metaSel(attr, key),
        () => {
          const m = document.createElement('meta');
          m.setAttribute(attr, key);
          return m;
        },
        (el) => el.setAttribute('content', content),
      );

    document.title = tags.title;
    setMeta('name', 'description', tags.description);
    setMeta('name', 'robots', tags.robots);

    upsert(
      'link[rel="canonical"]',
      () => {
        const l = document.createElement('link');
        l.setAttribute('rel', 'canonical');
        return l;
      },
      (el) => el.setAttribute('href', canonical),
    );

    setMeta('property', 'og:type', tags['og:type']);
    setMeta('property', 'og:title', tags['og:title']);
    setMeta('property', 'og:description', tags['og:description']);
    setMeta('property', 'og:image', tags['og:image']);
    setMeta('property', 'og:url', tags['og:url']);
    setMeta('name', 'twitter:card', tags['twitter:card']);
    setMeta('name', 'twitter:title', tags['twitter:title']);
    setMeta('name', 'twitter:description', tags['twitter:description']);
    setMeta('name', 'twitter:image', tags['twitter:image']);
  }, [tags, canonical]);

  const structuredDataItems = structuredData
    ? Array.isArray(structuredData)
      ? structuredData
      : [structuredData]
    : [];

  return (
    <Helmet>
      {/* Site-level entity + page-level structured data */}
      <script type="application/ld+json">{JSON.stringify(getOrganizationSchema())}</script>
      {structuredDataItems.map((item, index) => (
        <script key={`structured-data-${index}`} type="application/ld+json">
          {JSON.stringify(item)}
        </script>
      ))}
    </Helmet>
  );
}

export default SEOHead;
