import { Suspense } from 'react';
import AdminLoginContent from './admin-login-content';

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: '#6b7280', fontWeight: 500 }}>Initializing Security Gateway...</p>
        </div>
      </div>
    }>
      <AdminLoginContent />
    </Suspense>
  );
}
