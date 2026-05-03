import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/admin/format';
import { FileText, Plus, Eye, EyeOff, Pencil, Trash2, ExternalLink } from 'lucide-react';
import shared from '../admin-shared.module.css';
import Link from 'next/link';
import { toggleBlogPublish, deleteBlogPost } from '@/app/actions/admin/blogs';

export const metadata = {
  title: 'Quản lý Bài viết - Admin',
};

interface BlogPost {
  id: string;
  title: string | null;
  slug: string | null;
  category: string | null;
  read_time_minutes: number | null;
  is_published: boolean | null;
  published_at: string | null;
  excerpt: string | null;
}

export default async function AdminBlogsPage() {
  const supabase = await createClient();

  const { data: blogs, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, category, read_time_minutes, is_published, published_at, excerpt')
    .order('published_at', { ascending: false }) as { data: BlogPost[] | null, error: any };

  if (error) {
    return <div className={shared.page}><p className={shared.formError}>Lỗi tải bài viết: {error.message}</p></div>;
  }

  return (
    <div className={shared.page}>
      <div className={shared.card}>
        <div className={shared.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className={shared.cardTitle}>Danh sách Bài viết</h2>
          <Link
            href="/admin/blogs/new"
            className={`${shared.btn} ${shared.btnPrimary}`}
            style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            <Plus size={14} /> Viết bài mới
          </Link>
        </div>

        {(!blogs || blogs.length === 0) ? (
          <div className={shared.emptyState}>
            <div className={shared.emptyIcon}>
              <FileText size={24} />
            </div>
            <p className={shared.emptyTitle}>Chưa có bài viết nào</p>
            <p style={{ color: 'var(--vg-ink-500)', fontSize: 13, marginTop: 8 }}>
              Bấm &quot;Viết bài mới&quot; để tạo bài viết đầu tiên cho trang Blog.
            </p>
          </div>
        ) : (
          <div className={shared.tableWrap}>
            <table className={shared.table}>
              <thead>
                <tr>
                  <th>Bài viết</th>
                  <th>Chuyên mục</th>
                  <th>Trạng thái</th>
                  <th>Ngày xuất bản</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {blogs.map((blog) => (
                  <tr key={blog.id}>
                    <td>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>{blog.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--vg-ink-500)' }}>/{blog.slug} · {blog.read_time_minutes} phút đọc</div>
                    </td>
                    <td>
                      <span className={`${shared.badge} ${shared.badgeInfo}`}>{blog.category}</span>
                    </td>
                    <td>
                      <form action={toggleBlogPublish} style={{ display: 'inline' }}>
                        <input type="hidden" name="id" value={blog.id} />
                        <input type="hidden" name="publish" value={blog.is_published ? 'false' : 'true'} />
                        <button
                          type="submit"
                          className={`${shared.badge} ${blog.is_published ? shared.badgeSuccess : shared.badgeWarning}`}
                          style={{ cursor: 'pointer', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          {blog.is_published ? <><Eye size={12} /> Đã xuất bản</> : <><EyeOff size={12} /> Bản nháp</>}
                        </button>
                      </form>
                    </td>
                    <td>
                      <span style={{ fontSize: 13, color: 'var(--vg-ink-600)' }}>
                        {blog.published_at ? formatDate(blog.published_at) : 'Chưa xuất bản'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        {blog.is_published && (
                          <Link
                            href={`/blog/${blog.slug}`}
                            target="_blank"
                            className={shared.btnSecondary}
                            style={{ fontSize: 12, padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                          >
                            <ExternalLink size={12} /> Xem
                          </Link>
                        )}
                        <Link
                          href={`/admin/blogs/${blog.id}/edit`}
                          className={shared.btnSecondary}
                          style={{ fontSize: 12, padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                        >
                          <Pencil size={12} /> Sửa
                        </Link>
                        <form action={deleteBlogPost} style={{ display: 'inline' }}>
                          <input type="hidden" name="id" value={blog.id} />
                          <button
                            type="submit"
                            className={shared.btnSecondary}
                            style={{ fontSize: 12, padding: '5px 10px', color: 'var(--vg-danger-fg)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <Trash2 size={12} /> Xóa
                          </button>
                        </form>
                      </div>
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
