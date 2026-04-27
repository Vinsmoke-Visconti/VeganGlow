'use client';

import { useState } from 'react';
import {
  Store,
  CreditCard,
  Truck,
  Bell,
  Mail,
  Globe,
  Lock,
  Save,
  Sparkles,
} from 'lucide-react';
import sharedStyles from '../admin-shared.module.css';
import styles from './settings.module.css';

type Section = 'store' | 'payment' | 'shipping' | 'notifications' | 'integrations' | 'security';

const SECTIONS: { id: Section; icon: React.ReactNode; label: string; desc: string }[] = [
  {
    id: 'store',
    icon: <Store size={18} />,
    label: 'Thông tin cửa hàng',
    desc: 'Tên, logo, liên hệ và mô tả thương hiệu',
  },
  {
    id: 'payment',
    icon: <CreditCard size={18} />,
    label: 'Thanh toán',
    desc: 'COD, chuyển khoản, ví điện tử',
  },
  {
    id: 'shipping',
    icon: <Truck size={18} />,
    label: 'Vận chuyển',
    desc: 'Phí ship, vùng giao hàng, đối tác giao nhận',
  },
  {
    id: 'notifications',
    icon: <Bell size={18} />,
    label: 'Thông báo',
    desc: 'Email, SMS, push notification cho đơn hàng',
  },
  {
    id: 'integrations',
    icon: <Sparkles size={18} />,
    label: 'Tích hợp',
    desc: 'Google Analytics, Facebook Pixel, Zalo OA',
  },
  {
    id: 'security',
    icon: <Lock size={18} />,
    label: 'Bảo mật',
    desc: '2FA, phiên đăng nhập, RLS policies',
  },
];

export default function AdminSettings() {
  const [active, setActive] = useState<Section>('store');

  return (
    <div className={sharedStyles.page}>
      <header className={sharedStyles.pageHeader}>
        <div>
          <h1 className={sharedStyles.pageTitle}>Cài đặt hệ thống</h1>
          <p className={sharedStyles.pageSubtitle}>
            Cấu hình thông tin cửa hàng, thanh toán, vận chuyển và các tích hợp.
          </p>
        </div>
      </header>

      <div className={styles.layout}>
        {/* Side nav */}
        <aside className={styles.sideNav}>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`${styles.sideItem} ${active === s.id ? styles.sideItemActive : ''}`}
              onClick={() => setActive(s.id)}
            >
              <span className={styles.sideItemIcon}>{s.icon}</span>
              <span className={styles.sideItemBody}>
                <span className={styles.sideItemLabel}>{s.label}</span>
                <span className={styles.sideItemDesc}>{s.desc}</span>
              </span>
            </button>
          ))}
        </aside>

        {/* Content */}
        <div className={styles.content}>
          {active === 'store' && <StoreSection />}
          {active === 'payment' && <PaymentSection />}
          {active === 'shipping' && <ShippingSection />}
          {active === 'notifications' && <NotificationsSection />}
          {active === 'integrations' && <IntegrationsSection />}
          {active === 'security' && <SecuritySection />}
        </div>
      </div>
    </div>
  );
}

/* ──────────────── Sections ──────────────── */

function StoreSection() {
  return (
    <SettingsCard title="Thông tin cửa hàng" desc="Hiển thị trên storefront và email giao dịch">
      <FormGrid>
        <Field label="Tên cửa hàng" defaultValue="VeganGlow" />
        <Field label="Slogan" defaultValue="Vẻ đẹp tự nhiên, nâng niu thiên nhiên" />
        <Field
          label="Email liên hệ"
          type="email"
          defaultValue="hello@veganglow.vn"
          icon={<Mail size={14} />}
        />
        <Field label="Hotline" defaultValue="1900 1234" />
        <Field
          label="Địa chỉ HQ"
          defaultValue="123 Lê Lợi, Q.1, TP.HCM"
          full
        />
        <Field
          label="Website"
          defaultValue="https://veganglow.vn"
          icon={<Globe size={14} />}
          full
        />
      </FormGrid>
      <SaveBar />
    </SettingsCard>
  );
}

function PaymentSection() {
  return (
    <SettingsCard title="Phương thức thanh toán" desc="Bật/tắt các phương thức cho khách hàng">
      <ToggleRow
        title="COD — Thanh toán khi nhận hàng"
        desc="Phù hợp với khách lần đầu mua, đơn nhỏ"
        defaultChecked
      />
      <ToggleRow
        title="Chuyển khoản ngân hàng"
        desc="Hỗ trợ Vietcombank, BIDV, Techcombank"
        defaultChecked
      />
      <ToggleRow
        title="MoMo / ZaloPay"
        desc="Yêu cầu API key — chưa cấu hình"
      />
      <ToggleRow title="Visa / Master (Stripe)" desc="Chưa kích hoạt cho thị trường VN" />
      <SaveBar />
    </SettingsCard>
  );
}

function ShippingSection() {
  return (
    <SettingsCard title="Vận chuyển" desc="Phí giao hàng và vùng phục vụ">
      <FormGrid>
        <Field label="Phí giao tiêu chuẩn" defaultValue="30,000 đ" />
        <Field label="Miễn phí từ" defaultValue="500,000 đ" />
        <Field label="Đối tác giao nhận" defaultValue="GHN, GHTK, Viettel Post" full />
      </FormGrid>
      <ToggleRow
        title="Hỗ trợ giao toàn quốc"
        desc="63 tỉnh thành, thời gian 1-3 ngày làm việc"
        defaultChecked
      />
      <ToggleRow title="Giao hỏa tốc trong TP.HCM" desc="Phí 60.000đ, giao trong 2h" />
      <SaveBar />
    </SettingsCard>
  );
}

function NotificationsSection() {
  return (
    <SettingsCard title="Thông báo" desc="Cách hệ thống gửi cập nhật cho khách và nhân sự">
      <ToggleRow
        title="Email xác nhận đơn hàng"
        desc="Gửi cho khách ngay khi đặt thành công"
        defaultChecked
      />
      <ToggleRow
        title="Email cập nhật trạng thái"
        desc="Mỗi lần chuyển status: confirmed → shipping → completed"
        defaultChecked
      />
      <ToggleRow
        title="SMS Brandname"
        desc="Cần tích hợp với eSMS/VHT — chưa kết nối"
      />
      <ToggleRow
        title="Cảnh báo nhân sự (đơn mới)"
        desc="Thông báo trên dashboard khi có đơn pending"
        defaultChecked
      />
      <SaveBar />
    </SettingsCard>
  );
}

function IntegrationsSection() {
  return (
    <SettingsCard title="Tích hợp bên ngoài" desc="Marketing, analytics và messaging">
      <FormGrid>
        <Field label="Google Analytics ID" placeholder="G-XXXXXXXXXX" />
        <Field label="Facebook Pixel ID" placeholder="000000000000000" />
        <Field label="Zalo OA ID" placeholder="OA ID" />
        <Field label="Hotjar Site ID" placeholder="0000000" />
      </FormGrid>
      <SaveBar />
    </SettingsCard>
  );
}

function SecuritySection() {
  return (
    <SettingsCard title="Bảo mật & Tuân thủ" desc="Chính sách RLS, phiên đăng nhập, 2FA">
      <ToggleRow
        title="Bắt buộc 2FA cho admin"
        desc="Áp dụng cho role super_admin và manager"
      />
      <ToggleRow
        title="Tự đăng xuất sau 30 phút"
        desc="Phiên không hoạt động sẽ bị thu hồi"
        defaultChecked
      />
      <ToggleRow
        title="Ghi log mọi hành động admin"
        desc="Audit trail cho compliance"
        defaultChecked
      />
      <ToggleRow
        title="RLS bắt buộc trên mọi bảng"
        desc="Đã bật — quản lý qua Supabase Studio"
        defaultChecked
        disabled
      />
      <SaveBar />
    </SettingsCard>
  );
}

/* ──────────────── Reusable bits ──────────────── */

function SettingsCard({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.settingsCard}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>{title}</h3>
        {desc && <p className={styles.cardDesc}>{desc}</p>}
      </div>
      <div className={styles.cardBody}>{children}</div>
    </div>
  );
}

function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className={styles.formGrid}>{children}</div>;
}

function Field({
  label,
  defaultValue,
  placeholder,
  type = 'text',
  icon,
  full,
}: {
  label: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`${styles.formField} ${full ? styles.formFieldFull : ''}`}>
      <label className={styles.fieldLabel}>{label}</label>
      <div className={styles.fieldInputWrap}>
        {icon && <span className={styles.fieldIcon}>{icon}</span>}
        <input
          type={type}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className={styles.fieldInput}
          style={{ paddingLeft: icon ? '2.25rem' : '0.875rem' }}
        />
      </div>
    </div>
  );
}

function ToggleRow({
  title,
  desc,
  defaultChecked,
  disabled,
}: {
  title: string;
  desc: string;
  defaultChecked?: boolean;
  disabled?: boolean;
}) {
  const [checked, setChecked] = useState(!!defaultChecked);
  return (
    <div className={`${styles.toggleRow} ${disabled ? styles.toggleRowDisabled : ''}`}>
      <div className={styles.toggleText}>
        <div className={styles.toggleTitle}>{title}</div>
        <div className={styles.toggleDesc}>{desc}</div>
      </div>
      <button
        type="button"
        className={`${styles.toggle} ${checked ? styles.toggleOn : ''}`}
        onClick={() => !disabled && setChecked(!checked)}
        disabled={disabled}
        aria-label={title}
      >
        <span className={styles.toggleThumb} />
      </button>
    </div>
  );
}

function SaveBar() {
  return (
    <div className={styles.saveBar}>
      <span className={styles.saveBarHint}>Bản demo — thay đổi không được lưu vào DB</span>
      <button className={sharedStyles.btnPrimary} disabled>
        <Save size={16} />
        Lưu thay đổi
      </button>
    </div>
  );
}
