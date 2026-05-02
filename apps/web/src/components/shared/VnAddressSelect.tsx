'use client';

import { useEffect, useState } from 'react';
import { getProvinces, getWardsByProvince, type VnProvince, type VnWard } from '@/lib/vn-address';
import { SearchableSelect } from './SearchableSelect';

export type VnAddressValue = {
  province: string;
  province_code: string;
  ward: string;
  ward_code: string;
};

type Props = {
  value: VnAddressValue;
  onChange: (next: VnAddressValue) => void;
  required?: boolean;
  /** Render plain selects (default) or compact two-column inline layout */
  layout?: 'inline' | 'block';
  /** Inline label text — set null to hide labels */
  labels?: { province?: string; ward?: string } | null;
};

const baseInput: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  outline: 'none',
  fontSize: '0.95rem',
  backgroundColor: 'white',
};

export function VnAddressSelect({ value, onChange, required, layout = 'inline', labels }: Props) {
  const [provinces, setProvinces] = useState<VnProvince[]>([]);
  const [wards, setWards] = useState<VnWard[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingWards, setLoadingWards] = useState(false);

  useEffect(() => {
    let alive = true;
    getProvinces()
      .then((list) => {
        if (alive) setProvinces(list);
      })
      .catch((err) => console.error('VnAddressSelect provinces:', err))
      .finally(() => {
        if (alive) setLoadingProvinces(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!value.province_code) {
      setWards([]);
      return;
    }
    let alive = true;
    setLoadingWards(true);
    getWardsByProvince(value.province_code)
      .then((list) => {
        if (alive) setWards(list);
      })
      .catch((err) => console.error('VnAddressSelect wards:', err))
      .finally(() => {
        if (alive) setLoadingWards(false);
      });
    return () => {
      alive = false;
    };
  }, [value.province_code]);

  const handleProvince = (code: string) => {
    const p = provinces.find((x) => x.code === code);
    onChange({
      province_code: code,
      province: p?.name_with_type || '',
      ward_code: '',
      ward: '',
    });
  };

  const handleWard = (code: string) => {
    const w = wards.find((x) => x.code === code);
    onChange({
      ...value,
      ward_code: code,
      ward: w?.name_with_type || '',
    });
  };

  const showLabels = labels !== null;
  const labelProvince = labels?.province ?? 'Tỉnh / Thành phố';
  const labelWard = labels?.ward ?? 'Phường / Xã';

  const provinceOptions = provinces.map((p) => ({ label: p.name_with_type, value: p.code }));
  const wardOptions = wards.map((w) => ({ label: w.name_with_type, value: w.code }));

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: layout === 'inline' ? '1fr 1fr' : '1fr',
        gap: '1rem',
      }}
    >
      <div>
        {showLabels && (
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            {labelProvince}
          </label>
        )}
        <SearchableSelect
          options={provinceOptions}
          value={value.province_code}
          onChange={handleProvince}
          loading={loadingProvinces}
          placeholder="Chọn Tỉnh / Thành phố"
        />
      </div>

      <div>
        {showLabels && (
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            {labelWard}
          </label>
        )}
        <SearchableSelect
          options={wardOptions}
          value={value.ward_code}
          onChange={handleWard}
          loading={loadingWards}
          disabled={!value.province_code}
          placeholder={!value.province_code ? 'Chọn Tỉnh / Thành phố trước' : 'Chọn Phường / Xã'}
        />
      </div>
    </div>
  );
}

export const emptyVnAddress: VnAddressValue = {
  province: '',
  province_code: '',
  ward: '',
  ward_code: '',
};
