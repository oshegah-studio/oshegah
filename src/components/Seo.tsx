import { Helmet } from "react-helmet-async";

export const SITE_URL = "https://oshegah.com";

type SeoProps = {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
};

export function Seo({ title, description, path, noindex, jsonLd }: SeoProps) {
  const url = `${SITE_URL}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description.slice(0, 155)} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description.slice(0, 155)} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      {noindex ? <meta name="robots" content="noindex, follow" /> : null}
      {jsonLd ? <script type="application/ld+json">{JSON.stringify(jsonLd)}</script> : null}
    </Helmet>
  );
}
