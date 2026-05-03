import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/admin/format';
import { MessageSquare, Mail, User, Clock, CheckCircle2 } from 'lucide-react';
import shared from '../admin-shared.module.css';
import { resolveContactAction } from '@/app/actions/admin/contacts';

export const metadata = {
  title: 'Quản lý tin nhắn liên hệ - Admin',
};

export default async function AdminContactsPage() {
  const supabase = await createClient();

  // Fetch contact messages
  const { data: messages, error } = await supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return <div className={shared.page}><p className={shared.formError}>Lỗi tải tin nhắn: {error.message}</p></div>;
  }

  return (
    <div className={shared.page}>
      <div className={shared.card}>
        <div className={shared.cardHeader}>
          <h2 className={shared.cardTitle}>Tin nhắn khách hàng</h2>
        </div>

        {(!messages || messages.length === 0) ? (
          <div className={shared.emptyState}>
            <div className={shared.emptyIcon}>
              <MessageSquare size={24} />
            </div>
            <p className={shared.emptyTitle}>Chưa có tin nhắn nào</p>
          </div>
        ) : (
          <div className={shared.tableWrap}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Tiêu đề</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((msg) => (
                  <tr key={msg.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <User size={12} /> {msg.name}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--vg-ink-500)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Mail size={12} /> {msg.email}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>{msg.subject}</div>
                      <div style={{ fontSize: 13, color: 'var(--vg-ink-500)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {msg.message}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 13, color: 'var(--vg-ink-500)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> {formatDate(msg.created_at)}
                      </span>
                    </td>
                    <td>
                      {msg.resolved_at ? (
                        <span className={`${shared.badge} ${shared.badgeSuccess}`}>Đã xử lý</span>
                      ) : (
                        <span className={`${shared.badge} ${shared.badgeWarning}`}>Chưa xử lý</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <form action={resolveContactAction} style={{ display: 'inline' }}>
                        <input type="hidden" name="id" value={msg.id} />
                        <input type="hidden" name="resolve" value={msg.resolved_at ? 'false' : 'true'} />
                        <button 
                          type="submit" 
                          className={shared.btnSecondary} 
                          style={{ fontSize: 12, padding: '6px 12px' }}
                        >
                          {msg.resolved_at ? 'Đánh dấu Chưa xử lý' : <><CheckCircle2 size={12} style={{ display: 'inline', marginRight: 4 }} /> Đánh dấu Đã xử lý</>}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
