import AdminLayout from '@/components/layout/AdminLayout';
import { TrendingUp, Users, ShoppingCart, DollarSign } from 'lucide-react';

export default function AdminDashboard() {
  const stats = [
    { name: 'Doanh thu tháng', value: '45.2Mđ', trend: '+12%', icon: <DollarSign size={24} />, color: '#4caf50' },
    { name: 'Khách hàng mới', value: '1,280', trend: '+5.4%', icon: <Users size={24} />, color: '#2196f3' },
    { name: 'Đơn hàng', value: '342', trend: '+2.1%', icon: <ShoppingCart size={24} />, color: '#ff9800' },
    { name: 'Tỷ lệ chuyển đổi', value: '3.2%', trend: '-0.5%', icon: <TrendingUp size={24} />, color: '#9c27b0' },
  ];

  return (
    <AdminLayout>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: '800' }}>Tổng quan doanh thu</h1>
        <p style={{ color: 'var(--muted)' }}>Chào mừng quay lại, Admin. Đây là tình hình kinh doanh hôm nay.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {stats.map((stat) => (
          <div key={stat.name} className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '12px', background: `${stat.color}15`, color: stat.color }}>
                {stat.icon}
              </div>
              <span style={{ 
                color: stat.trend.startsWith('+') ? '#4caf50' : '#f44336', 
                fontSize: '0.875rem', 
                fontWeight: '700',
                padding: '4px 8px',
                borderRadius: '6px',
                background: stat.trend.startsWith('+') ? '#4caf5015' : '#f4433615'
              }}>
                {stat.trend}
              </span>
            </div>
            <h3 style={{ fontSize: '0.9375rem', color: 'var(--muted)', fontWeight: '500', marginBottom: '0.5rem' }}>{stat.name}</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: '800' }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem', minHeight: '300px' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Biểu đồ doanh thu (Mockup)</h3>
          <div style={{ 
            height: '200px', 
            background: 'linear-gradient(to top, var(--primary-light), transparent)', 
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '10px',
            padding: '20px'
          }}>
            {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h}%`, background: 'var(--primary)', borderRadius: '4px 4px 0 0' }}></div>
            ))}
          </div>
        </div>
        
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Sản phẩm bán chạy</h3>
          <ul style={{ listStyle: 'none' }}>
            <li style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
              <div style={{ width: '40px', height: '40px', background: '#eee', borderRadius: '8px' }}></div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: '600', fontSize: '0.875rem' }}>Serum Rau Má</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>142 đơn hàng</p>
              </div>
            </li>
            <li style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
              <div style={{ width: '40px', height: '40px', background: '#eee', borderRadius: '8px' }}></div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: '600', fontSize: '0.875rem' }}>Toner Diếp Cá</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>98 đơn hàng</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}
