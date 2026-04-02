/** Provider logos — files live in `client/public/images/` (copied to dist root by Vite). */
export const LINODE_LOGO_URL = '/images/linode-logo.png';
export const AWS_LOGO_URL = '/images/aws-logo.svg';
export const GCP_LOGO_URL = '/images/gcp-logo.svg';
export const DIGITALOCEAN_LOGO_URL = '/images/digitalocean-logo.svg';
export const VULTR_LOGO_URL = '/images/vultr-logo.svg';
export const OVH_LOGO_URL = '/images/ovh-logo.svg';
export const SUPABASE_LOGO_URL = '/images/supabase-logo.svg';
export const POSTGRESQL_LOGO_URL = '/images/postgresql-logo.svg';

const PROVIDER_LOGOS: Record<string, string> = {
  linode: LINODE_LOGO_URL,
  aws: AWS_LOGO_URL,
  gcp: GCP_LOGO_URL,
  digitalocean: DIGITALOCEAN_LOGO_URL,
  vultr: VULTR_LOGO_URL,
  'ovh-ca': OVH_LOGO_URL,
  'ovh-us': OVH_LOGO_URL,
};

export function getProviderLogo(provider: string): string | null {
  return PROVIDER_LOGOS[provider.toLowerCase()] ?? null;
}

export const SUPPORTED_PROVIDERS = [
  { value: 'linode', label: 'Linode / Akamai Cloud', logo: LINODE_LOGO_URL, available: true },
  { value: 'digitalocean', label: 'DigitalOcean', logo: DIGITALOCEAN_LOGO_URL, available: true },
  { value: 'ovh-ca', label: 'OVHcloud CA', logo: OVH_LOGO_URL, available: true },
  { value: 'ovh-us', label: 'OVHcloud US', logo: OVH_LOGO_URL, available: true },
  { value: 'aws', label: 'Amazon Web Services', logo: AWS_LOGO_URL, available: true },
  { value: 'gcp', label: 'Google Cloud Platform', logo: GCP_LOGO_URL, available: false },
  { value: 'vultr', label: 'Vultr', logo: VULTR_LOGO_URL, available: false },
];
