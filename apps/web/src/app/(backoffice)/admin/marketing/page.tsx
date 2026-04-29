import Link from 'next/link';
import { listVouchers, listBanners, listFlashSales } from '@/lib/admin/queries/marketing';
import { listProducts } from '@/lib/admin/queries/products';
import shared from '../admin-shared.module.css';
import { VouchersTab } from './_components/VouchersTab';
import { BannersTab } from './_components/BannersTab';
import { FlashTab } from './_components/FlashTab';

type Tab = 'vouchers' | 'banners' | 'flash';
type Props = { searchParams: Promise<{ tab?: Tab }> };

export default async function AdminMarketing({ searchParams }: Props) {
  const sp = await searchParams;
  const tab: Tab = sp.tab === 'banners' || sp.tab === 'flash' ? sp.tab : 'vouchers';

  const [vouchers, banners, flashSales, products] = await Promise.all([
    listVouchers(),
    listBanners(),
    listFlashSales(),
    listProducts({}),
  ]);

  return (
    <div className={shared.page}>
      <div className={shared.pageHeader}>
        <div>
          <h1 className={shared.pageTitle}>Marketing</h1>
          <p className={shared.pageSubtitle}>Voucher, banner và flash sale</p>
        </div>
      </div>

      <div className={shared.tabBar}>
        <Link
          href="?tab=vouchers"
          className={`${shared.tabBtn} ${tab === 'vouchers' ? shared.tabBtnActive : ''}`}
        >
          Voucher
        </Link>
        <Link
          href="?tab=banners"
          className={`${shared.tabBtn} ${tab === 'banners' ? shared.tabBtnActive : ''}`}
        >
          Banner
        </Link>
        <Link
          href="?tab=flash"
          className={`${shared.tabBtn} ${tab === 'flash' ? shared.tabBtnActive : ''}`}
        >
          Flash sale
        </Link>
      </div>

      {tab === 'vouchers' && <VouchersTab vouchers={vouchers} />}
      {tab === 'banners' && <BannersTab banners={banners} />}
      {tab === 'flash' && (
        <FlashTab
          sales={flashSales}
          products={products.map((p) => ({ id: p.id, name: p.name }))}
        />
      )}
    </div>
  );
}
