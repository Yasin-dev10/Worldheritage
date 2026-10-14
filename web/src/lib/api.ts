export type Locale = 'so' | 'en';

export type Country = {
  id: string;
  slug: string;
  isoAlpha2: string | null;
  region: string | null;
  revisionId: string;
  publishedAt: string | null;
  locale: Locale;
  title: string;
  summary: string;
};

export type CountryDetail = Country & {
  body: string;
  sources: Array<{
    locale: string | null;
    locator: string | null;
    claimNote: string;
    claimStanding: string;
    source: {
      sourceKind: string;
      creator: string | null;
      title: string;
      publisherOrCollection: string | null;
      publicationDateText: string | null;
      stableIdentifier: string | null;
      url: string | null;
      rightsStatus: string;
      rightsNotes: string | null;
    };
  }>;
  events?: Array<Record<string, unknown>>;
  people?: Array<Record<string, unknown>>;
  civilizations?: Array<Record<string, unknown>>;
};

export type CollectionResponse<T> = { data: T[]; nextCursor?: string | null; locale?: Locale };

export type PublicContent = {
  id: string;
  slug: string;
  locale: Locale;
  title: string;
  summary: string;
  body?: string;
  category?: string;
  region?: string | null;
  dateDisplay?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  datePrecision?: string;
  dateCertainty?: string;
  birthDateText?: string | null;
  birthYear?: number | null;
  deathDateText?: string | null;
  deathYear?: number | null;
  authorName?: string;
  editorName?: string | null;
  publishedAt?: string | null;
  updatedAt?: string;
  sources?: CountryDetail['sources'];
  events?: Array<Record<string, unknown>>;
  people?: Array<Record<string, unknown>>;
  countries?: Array<Record<string, unknown>>;
  civilizations?: Array<Record<string, unknown>>;
  periods?: Array<Record<string, unknown>>;
};

export type ApiResult<T> = {
  data: T | null;
  unavailable: boolean;
  notFound: boolean;
};

export const collections = {
  countries: {
    title: { so: 'Dalalka', en: 'Countries' },
    endpoint: 'countries',
    route: 'countries',
    implemented: true,
  },
  events: {
    title: { so: 'Dhacdooyinka', en: 'Events' },
    endpoint: 'events',
    route: 'events',
    implemented: true,
  },
  figures: {
    title: { so: 'Shakhsiyaadka', en: 'Historical figures' },
    endpoint: 'people',
    route: 'figures',
    implemented: true,
  },
  timelines: {
    title: { so: 'Jadwallada taariikhda', en: 'Timelines' },
    endpoint: 'timelines',
    route: 'timelines',
    implemented: true,
  },
  civilizations: {
    title: { so: 'Ilbaxnimooyinka', en: 'Civilizations' },
    endpoint: 'civilizations',
    route: 'civilizations',
    implemented: true,
  },
  history: {
    title: { so: 'Qoraallada taariikhda', en: 'History & articles' },
    endpoint: 'articles',
    route: 'history',
    implemented: true,
  },
  periods: {
    title: { so: 'Xilliyada taariikhda', en: 'Historical periods' },
    endpoint: 'periods',
    route: 'periods',
    implemented: true,
  },
} as const;

export type CollectionKey = keyof typeof collections;

const apiBase = (
  process.env.API_URL ??
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:4001/api/v1'
).replace(/\/$/, '');

export async function apiGet<T>(path: string): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${apiBase}/${path.replace(/^\//, '')}`, { cache: 'no-store' });
    if (response.status === 404) return { data: null, unavailable: false, notFound: true };
    if (!response.ok) return { data: null, unavailable: true, notFound: false };
    return { data: (await response.json()) as T, unavailable: false, notFound: false };
  } catch {
    return { data: null, unavailable: true, notFound: false };
  }
}

export function localeFrom(value: string | string[] | undefined): Locale {
  return value === 'en' ? 'en' : 'so';
}
