import { listShippingRates, getShippingConfig } from '@/lib/admin/queries/shipping';
import { ShippingRatesEditor } from './_components/ShippingRatesEditor';
import { ShippingConfigEditor } from './_components/ShippingConfigEditor';
import shared from '../../admin-shared.module.css';

export const metadata = { title: 'Cấu hình vận chuyển - Admin' };

export default async function ShippingSettingsPage() {
  const [rates, config] = await Promise.all([listShippingRates(), getShippingConfig()]);

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>Cấu hình vận chuyển</h1>
          <p className={shared.pageSubtitle}>
            Phí ship theo tỉnh thành và ngưỡng miễn phí giao hàng.
          </p>
        </div>
      </div>

      <section className={shared.card} style={{ marginBottom: 16 }}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>Cấu hình chung</h2>
        </div>
        <ShippingConfigEditor
          initial={
            config ?? {
              freeship_threshold_vnd: 500000,
              default_weight_kg: 0.3,
              currency: 'VND',
              estimated_processing_hours: 24,
            }
          }
        />
      </section>

      <section className={shared.card}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>Bảng phí theo tỉnh thành ({rates.length})</h2>
        </div>
        <ShippingRatesEditor initial={rates} />
      </section>
    </div>
  );
}
