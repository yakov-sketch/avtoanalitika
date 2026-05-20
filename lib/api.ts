const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export type ScoreComponent = { label: string; value: number; explain: string };
export type Score = {
  key: string;
  name: string;
  value: number;
  grade: string;
  color: 'green' | 'yellow' | 'slate' | 'gray';
  available: boolean;
  formula: string;
  components: ScoreComponent[];
  interpretation: string;
};
export type OpportunityType = {
  key: string;
  title: string;
  description: string;
};
export type ScoresBundle = {
  deficit: Score;
  liquidity: Score;
  turnover: Score;
  capacity: Score;
  priceSpread: Score;
  arbitrage: Score;
  velocity: Score;
  trend: Score;
  demand: Score;
  attractiveness: Score;
  opportunity: OpportunityType;
};

export type MetricDefinition = { key: string; title: string; short: string; full: string };
export type GlossaryResponse = {
  metrics: MetricDefinition[];
  opportunityTypes: OpportunityType[];
};

export type CarGroup = {
  id: string;
  mark: string;
  model: string;
  generation: string | null;
  configuration: string | null;
  fullName: string;
  activeCount: number;
  removedCount: number;
  avgPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  sellersCount: number;
  regionsCount: number;
  regionsPresent: string[];
  districtsPresent: string[];
  districtsMissing: string[];
  platforms: string[];
  sections: string[];
  minYear: number | null;
  maxYear: number | null;
  isPremium: boolean;
  scores: ScoresBundle;
};

export type Listing = {
  id: number;
  innerId: string;
  platform: string;
  status: string;
  mark: string | null;
  model: string | null;
  generation: string | null;
  configuration: string | null;
  complectation: string | null;
  bodyType: string | null;
  year: number | null;
  priceRub: number | null;
  kmAge: number | null;
  engineType: string | null;
  displacement: number | null;
  horsePower: number | null;
  transmission: string | null;
  driveType: string | null;
  color: string | null;
  wheel: string | null;
  section: string | null;
  condition: string | null;
  ownersCount: number | null;
  noAccidents: string | null;
  seller: string | null;
  sellerType: string | null;
  region: string | null;
  city: string | null;
  address: string | null;
  district: string | null;
  url: string | null;
  sellerUrl: string | null;
  vin: string | null;
  pts: string | null;
  custom: string | null;
  inStock: string | null;
  stateNotBeaten: string | null;
  priceUsd: number | null;
  priceEur: number | null;
  offerUpdatedAt: string | null;
  imageUrls: string | null;
  options: string | null;
  description: string | null;
};

export type MarketTotals = {
  totalListings: number;
  newCars: number;
  underOneYear: number;
  rareModels: number;
  totalGroups: number;
};

export type PlatformAnalytics = {
  id: string;
  totalListings: number;
  newCars: number;
  underOneYear: number;
  rareModels: number;
  avgPrice: number;
  regions: { name: string; value: number }[];
  topBrands: string[];
  commentary: string;
};

export type RegionAnalytics = {
  id: string;
  district: string | null;
  totalListings: number;
  avgPrice: number;
  competition: 'Низкая' | 'Средняя' | 'Высокая';
  popularModels: string[];
  deficitModels: string[];
  recommendation: string;
  topPlatforms: { id: string; count: number }[];
  topCities: { name: string; count: number }[];
  sections: { name: string; count: number }[];
  avgYear: number | null;
  avgKm: number | null;
};

export type OverviewResponse = {
  totals: MarketTotals;
  platforms: PlatformAnalytics[];
  rarePreview: CarGroup[];
  snapshotDate: string | null;
  districts: string[];
};

export type SearchMetadata = {
  platforms: string[];
  brands: string[];
  bodyTypes: string[];
  districts: string[];
  regions: string[];
};

export type SearchFilters = {
  platform?: string;
  brand?: string;
  model?: string;
  bodyType?: string;
  region?: string;
  district?: string;
  section?: 'NEW' | 'USED';
  priceFrom?: number;
  priceTo?: number;
  yearFrom?: number;
  yearTo?: number;
  listingsFrom?: number;
  listingsTo?: number;
  rareOnly?: boolean;
  premiumOnly?: boolean;
  sort?: 'attractiveness' | 'deficit' | 'liquidity' | 'demand' | 'turnover' | 'price_asc' | 'price_desc';
};

export type SearchResponse = {
  filters: SearchFilters;
  total: number;
  items: CarGroup[];
};

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`API ${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type PipelineStatus = 'watch' | 'in_progress' | 'bought' | 'rejected';

export type PipelineItem = {
  id: number;
  entityType: 'group' | 'listing';
  entityId: string;
  entityUrl: string | null;
  label: string | null;
  status: PipelineStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UniversalSearchResponse = {
  groups: CarGroup[];
  regions: string[];
  platforms: string[];
  brands: string[];
};

export const api = {
  overview: () => fetchJson<OverviewResponse>('/api/v1/overview'),
  metadata: () => fetchJson<SearchMetadata>('/api/v1/search-metadata'),
  search: (filters: SearchFilters) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v === undefined || v === null || v === '') continue;
      const key = k.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
      sp.set(key, typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v));
    }
    const qs = sp.toString();
    return fetchJson<SearchResponse>(`/api/v1/rare-models${qs ? `?${qs}` : ''}`);
  },
  group: (id: string) => fetchJson<CarGroup>(`/api/v1/models/${encodeURIComponent(id)}`),
  groupListings: (id: string, limit = 50) =>
    fetchJson<Listing[]>(`/api/v1/models/${encodeURIComponent(id)}/listings?limit=${limit}`),
  platform: (id: string) => fetchJson<PlatformAnalytics>(`/api/v1/platforms/${encodeURIComponent(id)}`),
  region: (id: string) => fetchJson<RegionAnalytics>(`/api/v1/regions/${encodeURIComponent(id)}`),
  regions: () => fetchJson<RegionAnalytics[]>('/api/v1/regions'),
  pipelineList: (status?: string) =>
    fetchJson<PipelineItem[]>(`/api/v1/pipeline${status ? `?status=${status}` : ''}`),
  pipelineUpsert: (body: { entityType: 'group' | 'listing'; entityId: string; entityUrl?: string | null; status: PipelineStatus; label?: string | null; note?: string | null }) =>
    fetchJson<PipelineItem>('/api/v1/pipeline', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  pipelineDelete: (entityType: string, entityId: string) =>
    fetchJson<{ status: string }>(`/api/v1/pipeline/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`, {
      method: 'DELETE',
    }),
  universalSearch: (q: string) =>
    fetchJson<UniversalSearchResponse>(`/api/v1/search-everything?q=${encodeURIComponent(q)}`),
  glossary: () => fetchJson<GlossaryResponse>('/api/v1/glossary'),
};

export function formatRubles(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatInt(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('ru-RU').format(value);
}
