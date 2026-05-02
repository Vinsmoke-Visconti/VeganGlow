'use client';

import { useState, useTransition, useMemo } from 'react';
import { Loader2, Save, CheckCircle, Shield, Search, User, Users, ChevronRight, ChevronDown, Lock, Info, Plus } from 'lucide-react';
import { setRolePermissions } from '@/app/actions/admin/roles';
import shared from '../../admin-shared.module.css';

type Permission = {
  id: string;
  module: string;
  action: string;
  description: string;
};

type RoleWithPerms = {
  id: string;
  name: string;
  display_name: string;
  weight: number;
  permissionIds: string[];
};

type StaffMember = {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  role: { id: string; name: string; display_name: string; weight: number } | null;
};

const MODULE_LABEL: Record<string, string> = {
  audit: 'AUDIT (Nhật ký)',
  categories: 'CATEGORIES (Danh mục)',
  content: 'CONTENT (Nội dung)',
  customers: 'CUSTOMERS (Khách hàng)',
  orders: 'ORDERS (Đơn hàng)',
  inventory: 'INVENTORY (Kho)',
  users: 'ROLES & USERS (Hệ thống)',
  products: 'Sản phẩm',
  marketing: 'Marketing',
  settings: 'Cài đặt',
};

export function PermissionMatrix({
  roles,
  permissions,
  staff,
  currentUser,
}: {
  roles: RoleWithPerms[];
  permissions: Permission[];
  staff: StaffMember[];
  currentUser: any;
}) {
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set([roles[0]?.id]));
  const [selectedTarget, setSelectedTarget] = useState<{ type: 'role' | 'account'; id: string }>({ 
    type: 'role', 
    id: roles[0]?.id 
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  const [state, setState] = useState<Record<string, Set<string>>>(() => ({
    ...Object.fromEntries(roles.map(r => [r.id, new Set(r.permissionIds)])),
    // For now, accounts inherit role perms in this UI state
    ...Object.fromEntries(staff.map(s => [s.id, new Set(roles.find(r => r.id === s.role?.id)?.permissionIds || [])]))
  }));
  
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [, start] = useTransition();

  const currentUserWeight = currentUser?.role?.weight ?? 4;
  const isSuperAdmin = currentUser?.role?.name === 'super_admin';
  const myPerms = new Set(roles.find(r => r.id === currentUser?.role?.id)?.permissionIds || []);
  const hasPerm = (permId: string) => isSuperAdmin || myPerms.has(permId);

  // Determine current editing target details
  const activeRole = roles.find(r => r.id === selectedTarget.id);
  const activeStaff = staff.find(s => s.id === selectedTarget.id);
  const targetWeight = selectedTarget.type === 'role' ? (activeRole?.weight ?? 4) : (activeStaff?.role?.weight ?? 4);
  
  const canEdit = isSuperAdmin || targetWeight > currentUserWeight;

  function toggleExpand(roleId: string) {
    setExpandedRoles(prev => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  }

  function togglePerm(permId: string) {
    if (!canEdit || !hasPerm(permId)) return;
    setState(s => {
      const next = new Set(s[selectedTarget.id]);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return { ...s, [selectedTarget.id]: next };
    });
  }

  const byModule = useMemo(() => {
    return permissions.reduce<Record<string, Permission[]>>((acc, p) => {
      const term = searchTerm.toLowerCase();
      if (searchTerm && !p.description.toLowerCase().includes(term) && !p.module.toLowerCase().includes(term)) {
        return acc;
      }
      (acc[p.module] ??= []).push(p);
      return acc;
    }, {});
  }, [permissions, searchTerm]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 1, background: 'var(--vg-border)', border: '1px solid var(--vg-border)', borderRadius: 8, overflow: 'hidden', height: 'calc(100vh - 160px)', minHeight: 650, marginTop: 20 }}>
      {/* Sidebar: Role > Account Hierarchy */}
      <div style={{ background: 'var(--vg-surface-0)', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--vg-border)' }}>
        <div style={{ padding: '16px', background: 'var(--vg-surface-50)', borderBottom: '1px solid var(--vg-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <h3 style={{ fontSize: 11, fontWeight: 900, color: 'var(--vg-ink-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CẤU TRÚC PHÂN QUYỀN</h3>
           <Plus size={14} style={{ cursor: 'pointer', color: 'var(--vg-leaf-700)' }} />
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
           {roles.filter(r => r.name !== 'customer').map(role => {
             const isExpanded = expandedRoles.has(role.id);
             const roleStaff = staff.filter(s => s.role?.id === role.id);
             const isSelected = selectedTarget.type === 'role' && selectedTarget.id === role.id;

             return (
               <div key={role.id}>
                  {/* Role Row */}
                  <div 
                    onClick={() => { setSelectedTarget({ type: 'role', id: role.id }); toggleExpand(role.id); }}
                    style={{ 
                      padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                      background: isSelected ? 'var(--vg-leaf-50)' : 'transparent',
                      borderLeft: isSelected ? '4px solid var(--vg-leaf-700)' : '4px solid transparent',
                      transition: 'all 0.1s'
                    }}
                  >
                     {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                     <Users size={14} color={isSelected ? 'var(--vg-leaf-700)' : 'var(--vg-ink-400)'} />
                     <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: isSelected ? 900 : 700, color: isSelected ? 'var(--vg-leaf-900)' : 'var(--vg-ink-800)' }}>{role.display_name}</div>
                        <div style={{ fontSize: 10, opacity: 0.5 }}>Weight: {role.weight}</div>
                     </div>
                  </div>

                  {/* Account Rows (Drill-down) */}
                  {isExpanded && (
                    <div style={{ background: 'var(--vg-surface-50)' }}>
                       {roleStaff.map(s => {
                         const isAccSelected = selectedTarget.type === 'account' && selectedTarget.id === s.id;
                         return (
                           <div 
                             key={s.id}
                             onClick={() => setSelectedTarget({ type: 'account', id: s.id })}
                             style={{ 
                               padding: '8px 16px 8px 48px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                               background: isAccSelected ? 'var(--vg-surface-0)' : 'transparent',
                               borderLeft: isAccSelected ? '4px solid var(--vg-leaf-600)' : '4px solid transparent',
                               boxShadow: isAccSelected ? 'inset 0 0 10px rgba(0,0,0,0.02)' : 'none'
                             }}
                           >
                              <User size={12} color={isAccSelected ? 'var(--vg-leaf-600)' : 'var(--vg-ink-300)'} />
                              <div style={{ flex: 1 }}>
                                 <div style={{ fontSize: 12, fontWeight: isAccSelected ? 800 : 600, color: isAccSelected ? 'var(--vg-ink-900)' : 'var(--vg-ink-600)' }}>{s.full_name}</div>
                                 <div style={{ fontSize: 9, opacity: 0.5 }}>{s.email}</div>
                              </div>
                              {!s.is_active && <Lock size={10} color="var(--vg-danger-fg)" />}
                           </div>
                         );
                       })}
                       {roleStaff.length === 0 && <div style={{ padding: '8px 48px', fontSize: 10, color: 'var(--vg-ink-300)' }}>Chưa có nhân sự</div>}
                    </div>
                  )}
               </div>
             );
           })}
        </div>
      </div>

      {/* Main Area: Permissions Grid */}
      <div style={{ background: 'var(--vg-surface-0)', display: 'flex', flexDirection: 'column' }}>
        {/* Top Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--vg-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--vg-surface-50)' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--vg-parchment-100)', display: 'grid', placeItems: 'center' }}>
                 {selectedTarget.type === 'role' ? <Users size={20} /> : <User size={20} />}
              </div>
              <div>
                 <h2 style={{ fontSize: 15, fontWeight: 900 }}>{selectedTarget.type === 'role' ? activeRole?.display_name : activeStaff?.full_name}</h2>
                 <div style={{ fontSize: 11, color: 'var(--vg-ink-400)' }}>
                    {selectedTarget.type === 'role' ? `Thiết lập quyền mặc định cho nhóm` : `Thiết lập quyền cụ thể cho nhân sự (${activeStaff?.role?.display_name})`}
                 </div>
              </div>
           </div>

           <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                 <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--vg-ink-400)' }} />
                 <input className={shared.formInput} style={{ height: 32, paddingLeft: 32, width: 200, fontSize: 12 }} placeholder="Tìm quyền..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              {canEdit && (
                <button className={`${shared.btn} ${shared.btnPrimary}`} style={{ height: 32, padding: '0 16px', fontSize: 12 }}>
                   <Save size={14} /> LƯU THAY ĐỔI
                </button>
              )}
           </div>
        </div>

        {/* Permissions Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
           {!canEdit ? (
              <div style={{ padding: '60px 0', textAlign: 'center' }}>
                 <Shield size={48} strokeWidth={1} style={{ color: 'var(--vg-ink-200)', marginBottom: 16 }} />
                 <h3 style={{ fontWeight: 900, color: 'var(--vg-ink-900)' }}>Truy cập bị hạn chế</h3>
                 <p style={{ fontSize: 13, color: 'var(--vg-ink-400)' }}>Bạn không đủ thẩm quyền để điều chỉnh đối tượng này (W{targetWeight} ≥ W{currentUserWeight}).</p>
              </div>
           ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                 {Object.entries(byModule).map(([mod, perms]) => (
                    <div key={mod}>
                       <h4 style={{ fontSize: 11, fontWeight: 900, color: 'var(--vg-leaf-800)', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <ChevronRight size={12} /> {MODULE_LABEL[mod] || mod}
                       </h4>
                       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                          {perms.map(p => {
                            const active = state[selectedTarget.id]?.has(p.id);
                            const allowed = hasPerm(p.id);
                            return (
                              <div 
                                key={p.id}
                                onClick={() => allowed && togglePerm(p.id)}
                                style={{ 
                                  padding: '10px 14px', borderRadius: 8, border: '1px solid',
                                  borderColor: !allowed ? 'var(--vg-border)' : active ? 'var(--vg-leaf-200)' : 'var(--vg-border)',
                                  background: !allowed ? 'var(--vg-surface-50)' : active ? 'var(--vg-leaf-50)' : 'var(--vg-surface-0)',
                                  display: 'flex', alignItems: 'center', gap: 12, cursor: allowed ? 'pointer' : 'not-allowed',
                                  transition: 'all 0.1s', opacity: allowed ? 1 : 0.8
                                }}
                              >
                                 <div style={{ 
                                   width: 18, height: 18, borderRadius: 4, border: '2px solid',
                                   borderColor: !allowed ? 'var(--vg-ink-200)' : active ? 'var(--vg-leaf-600)' : 'var(--vg-parchment-300)',
                                   background: active ? 'var(--vg-leaf-600)' : 'transparent',
                                   display: 'grid', placeItems: 'center', flexShrink: 0
                                 }}>
                                    {active && <CheckCircle size={14} color="#fff" />}
                                    {!allowed && <Lock size={10} color="var(--vg-ink-300)" />}
                                 </div>
                                 <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 12, fontWeight: active ? 800 : 600, color: active ? 'var(--vg-ink-900)' : 'var(--vg-ink-700)' }}>{p.description || p.action}</div>
                                 </div>
                              </div>
                            );
                          })}
                       </div>
                    </div>
                 ))}
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
