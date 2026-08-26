import { Helmet } from "react-helmet-async";

export const SITE_URL = "https://oshegah.com";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

type SeoProps = {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
  image?: string;
  imageAlt?: string;
};

export function Seo({ title, description, path, noindex, jsonLd, image, imageAlt }: SeoProps) {
  const url = `${SITE_URL}${path}`;
  const desc = description.slice(0, 155);
  const ogImage = image ?? DEFAULT_OG_IMAGE;
  const alt = imageAlt ?? "OSHEGAH smart NFC business card";
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={alt} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImage} />
      {noindex ? <meta name="robots" content="noindex, follow" /> : null}
      {jsonLd ? <script type="application/ld+json">{JSON.stringify(jsonLd)}</script> : null}
    </Helmet>
  );
}
