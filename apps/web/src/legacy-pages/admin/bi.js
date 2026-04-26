import AdminLayout from '@/components/layout/AdminLayout';
import { BarChart, LineChart as LineIcon, PieChart as PieIcon, Download } from 'lucide-react';

export default function BIDashboard() {
  return (
    <AdminLayout>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: '800' }}>BI Report: Đỉnh cao doanh thu</h1>
          <p style={{ color: 'var(--muted)' }}>Phân tích chuyên sâu về tăng trưởng và hiệu quả kinh doanh.</p>
        </div>
        <button className="btn" style={{ border: '1px solid var(--border)', display: 'flex', gap: '0.5rem' }}>
          <Download size={18} />
          <span>Xuất báo cáo PDF</span>
        </button>
      </header>

      {/* KPI Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Tổng doanh thu', value: '1.2Bđ' },
          { label: 'AOV (Giá trị ĐH)', value: '450kđ' },
          { label: 'Tỷ lệ chuyển đổi', value: '3.5%' },
          { label: 'Tỷ lệ quay lại', value: '25%' },
          { label: 'Chi phí QC', value: '120Mđ' },
        ].map(kpi => (
          <div key={kpi.label} className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{kpi.label}</p>
            <p style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)' }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Line Chart 1 */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem' }}>Doanh thu theo thời gian (Line Chart)</h3>
            <LineIcon size={18} color="var(--muted)" />
          </div>
          <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '5px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
             {[20, 35, 60, 45, 80, 95, 100, 85, 90, 70, 80, 95].map((v, i) => (
                <div key={i} style={{ flex: 1, height: `${v}%`, background: 'var(--primary)', opacity: 0.3 + (v/150), borderRadius: '2px' }}></div>
             ))}
          </div>
          <p style={{ fontSize: '0.75rem', marginTop: '1rem', color: 'var(--muted)' }}>* Ghi chú: Doanh thu tăng mạnh vào quý 3 nhờ chiến dịch Social Media.</p>
        </div>

        {/* Line Chart 2 */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem' }}>Lượng truy cập vs Chuyển đổi</h3>
            <BarChart size={18} color="var(--muted)" />
          </div>
          <div style={{ height: '200px', background: '#fcfcfc', borderRadius: '8px', border: '1px dashed #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: '0.875rem' }}>
            [Placeholder: Chart.js / Recharts Implementation]
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
        {/* Donut Chart */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>Cơ cấu doanh thu theo danh mục</h3>
          <div style={{ width: '150px', height: '150px', borderRadius: '50%', border: '25px solid var(--primary)', margin: '0 auto', position: 'relative' }}>
             <div style={{ position: 'absolute', inset: '-25px', borderRadius: '50%', border: '25px solid var(--primary-light)', clipPath: 'polygon(50% 50%, 100% 0, 100% 100%, 0 100%)' }}></div>
          </div>
          <div style={{ marginTop: '2rem' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                <span>Serum</span>
                <span style={{ fontWeight: '700' }}>45%</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>Khác</span>
                <span style={{ fontWeight: '700' }}>55%</span>
             </div>
          </div>
        </div>

        {/* Growth Matrix */}
        <div className="card" style={{ padding: '1.5rem' }}>
           <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>Dự báo tăng trưởng Quý tiếp theo</h3>
           <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '0.75rem 0' }}>KỊCH BẢN</th>
                  <th style={{ padding: '0.75rem 0' }}>DỰ BÁO DOANH THU</th>
                  <th style={{ padding: '0.75rem 0' }}>XÁC SUẤT</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem 0' }}>Lạc quan</td>
                  <td style={{ padding: '1rem 0', fontWeight: '700' }}>1.5Bđ</td>
                  <td style={{ padding: '1rem 0' }}>30%</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem 0' }}>Cơ sở</td>
                  <td style={{ padding: '1rem 0', fontWeight: '700' }}>1.3Bđ</td>
                  <td style={{ padding: '1rem 0', color: 'var(--primary)', fontWeight: '700' }}>60%</td>
                </tr>
              </tbody>
           </table>
        </div>
      </div>
    </AdminLayout>
  );
}
