// Vietnam administrative address loader (post-2025 reform: 34 provinces + ~3.3k wards/communes).
// Source: vietmap-company/vietnam_administrative_address (admin_new branch).
// Files: /data/vn-provinces.json, /data/vn-wards.json (under public/).

export type VnProvince = {
  code: string;
  name: string;
  slug: string;
  type: string;
  name_with_type: string;
};

export type VnWard = {
  code: string;
  name: string;
  slug: string;
  type: string;
  name_with_type: string;
  path: string;
  path_with_type: string;
  parent_code: string;
};

type ProvinceMap = Record<string, VnProvince>;
type WardMap = Record<string, VnWard>;

let provincesCache: VnProvince[] | null = null;
let wardsByProvinceCache: Map<string, VnWard[]> | null = null;
let loadingPromise: Promise<void> | null = null;

async function loadOnce() {
  if (provincesCache && wardsByProvinceCache) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const [pRes, wRes] = await Promise.all([
      fetch('/data/vn-provinces.json'),
      fetch('/data/vn-wards.json'),
    ]);
    if (!pRes.ok || !wRes.ok) throw new Error('Không tải được dữ liệu địa chỉ.');

    const provinceMap = (await pRes.json()) as ProvinceMap;
    const wardMap = (await wRes.json()) as WardMap;

    provincesCache = Object.values(provinceMap).sort((a, b) =>
      a.name.localeCompare(b.name, 'vi')
    );

    const grouped = new Map<string, VnWard[]>();
    for (const w of Object.values(wardMap)) {
      const list = grouped.get(w.parent_code) || [];
      list.push(w);
      grouped.set(w.parent_code, list);
    }
    for (const list of grouped.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    }
    wardsByProvinceCache = grouped;
  })();

  await loadingPromise;
}

export async function getProvinces(): Promise<VnProvince[]> {
  await loadOnce();
  return provincesCache!;
}

export async function getWardsByProvince(provinceCode: string): Promise<VnWard[]> {
  if (!provinceCode) return [];
  await loadOnce();
  return wardsByProvinceCache!.get(provinceCode) || [];
}
