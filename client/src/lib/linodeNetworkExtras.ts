export type LinodeNetworkExtrasParsed = {
  vpc_ipv4: string[];
  vpc_ipv6: string[];
  nat_1_1_ipv4: string[];
  vpc_subnet_lines: string[];
};

export function parseLinodeNetworkExtras(raw: unknown): LinodeNetworkExtrasParsed | null {
  if (raw == null || raw === '') return null;
  let o: unknown = raw;
  if (typeof raw === 'string') {
    try {
      o = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
  if (typeof o !== 'object' || o === null) return null;
  const x = o as Record<string, unknown>;
  const asStrArr = (v: unknown): string[] => {
    if (!Array.isArray(v)) return [];
    return v
      .filter((i): i is string => typeof i === 'string' && i.trim() !== '')
      .map((s) => s.trim());
  };
  const vpc4 = asStrArr(x.vpc_ipv4);
  const vpc6 = asStrArr(x.vpc_ipv6);
  const nat = asStrArr(x.nat_1_1_ipv4);
  const subnets = asStrArr(x.vpc_subnet_lines);
  if (vpc4.length === 0 && vpc6.length === 0 && nat.length === 0 && subnets.length === 0) return null;
  return { vpc_ipv4: vpc4, vpc_ipv6: vpc6, nat_1_1_ipv4: nat, vpc_subnet_lines: subnets };
}
