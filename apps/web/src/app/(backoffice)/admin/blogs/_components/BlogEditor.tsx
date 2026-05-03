'use client';

import { useState, useTransition, useActionState } from 'react';
import { Loader2, Save, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { createBlogPost, updateBlogPost } from '@/app/actions/admin/blogs';
import shared from '../../admin-shared.module.css';
import Link from 'next/link';

type Section = { heading: string; content: string };

type BlogData = {
  id?: string;
  title: string;
  excerpt: string;
  category: string;
  lead: string;
  read_time_minutes: number;
  is_published: boolean;
  sections: Section[];
} | null;

export function BlogEditor({ blog }: { blog?: BlogData }) {
  const isEdit = !!blog?.id;
  const action = isEdit ? updateBlogPost : createBlogPost;
  const [state, formAction] = useActionState(action, null);
  const [pending, start] = useTransition();

  const [sections, setSections] = useState<Section[]>(
    blog?.sections?.length ? blog.sections : [{ heading: '', content: '' }]
  );

  const addSection = () => setSections([...sections, { heading: '', content: '' }]);
  const removeSection = (idx: number) => setSections(sections.filter((_, i) => i !== idx));
  const updateSection = (idx: number, field: 'heading' | 'content', value: string) => {
    const updated = [...sections];
    updated[idx] = { ...updated[idx], [field]: value };
    setSections(updated);
  };

  return (
    <div className={shared.page}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/admin/blogs" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--vg-primary)', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
          <ArrowLeft size={16} /> Quay lại danh sách
        </Link>
      </div>

      <div className={shared.card} style={{ padding: 32 }}>
        <h2 className={shared.cardTitle} style={{ marginBottom: 24 }}>
          {isEdit ? 'Chỉnh sửa bài viết' : 'Viết bài mới'}
        </h2>

        <form action={(formData) => { start(() => formAction(formData)); }}>
          {isEdit && <input type="hidden" name="id" value={blog!.id} />}

          {/* Basic Info */}
          <div className={shared.formField}>
            <label className={shared.formLabel}>Tiêu đề bài viết *</label>
            <input
              name="title"
              className={shared.formInput}
              defaultValue={blog?.title || ''}
              placeholder="VD: Bí quyết chăm sóc da mùa hè"
              required
            />
          </div>

          <div className={shared.formRow}>
            <div className={shared.formField}>
              <label className={shared.formLabel}>Chuyên mục</label>
              <input
                name="category"
                className={shared.formInput}
                defaultValue={blog?.category || ''}
                placeholder="VD: Skincare, Hướng dẫn, Khoa học da"
              />
            </div>
            <div className={shared.formField}>
              <label className={shared.formLabel}>Thời gian đọc (phút)</label>
              <input
                name="read_time_minutes"
                type="number"
                className={shared.formInput}
                defaultValue={blog?.read_time_minutes || 5}
                min={1}
                max={60}
              />
            </div>
          </div>

          <div className={shared.formField}>
            <label className={shared.formLabel}>Mô tả ngắn (hiện ở danh sách blog) *</label>
            <textarea
              name="excerpt"
              className={shared.formTextarea}
              defaultValue={blog?.excerpt || ''}
              rows={2}
              placeholder="Tóm tắt nội dung bài viết trong 1-2 câu..."
              required
            />
          </div>

          <div className={shared.formField}>
            <label className={shared.formLabel}>Đoạn dẫn nhập (Lead - hiện đầu bài viết)</label>
            <textarea
              name="lead"
              className={shared.formTextarea}
              defaultValue={blog?.lead || ''}
              rows={3}
              placeholder="Đoạn mở đầu hấp dẫn để thu hút người đọc..."
            />
          </div>

          {/* Sections */}
          <div style={{ marginTop: 32, marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--vg-ink-800)', marginBottom: 4 }}>
              Nội dung bài viết
            </h3>
            <p style={{ fontSize: 13, color: 'var(--vg-ink-500)', marginBottom: 16 }}>
              Mỗi phần có 1 tiêu đề nhỏ và nội dung chi tiết. Thêm bao nhiêu phần cũng được.
            </p>
          </div>

          {sections.map((section, idx) => (
            <div
              key={idx}
              style={{
                padding: 20,
                marginBottom: 16,
                borderRadius: 12,
                border: '1px solid var(--vg-ink-200)',
                background: 'var(--vg-ink-50)',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--vg-ink-600)' }}>
                  Phần {idx + 1}
                </span>
                {sections.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSection(idx)}
                    style={{
                      background: 'none', border: 'none', color: 'var(--vg-danger-fg)',
                      cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12
                    }}
                  >
                    <Trash2 size={14} /> Xóa
                  </button>
                )}
              </div>

              <div className={shared.formField}>
                <label className={shared.formLabel}>Tiêu đề phần</label>
                <input
                  name={`section_heading_${idx}`}
                  className={shared.formInput}
                  value={section.heading}
                  onChange={(e) => updateSection(idx, 'heading', e.target.value)}
                  placeholder="VD: Tại sao da cần kem chống nắng?"
                />
              </div>
              <div className={shared.formField}>
                <label className={shared.formLabel}>Nội dung *</label>
                <textarea
                  name={`section_content_${idx}`}
                  className={shared.formTextarea}
                  value={section.content}
                  onChange={(e) => updateSection(idx, 'content', e.target.value)}
                  rows={5}
                  placeholder="Viết nội dung chi tiết cho phần này..."
                  required
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addSection}
            className={shared.btnSecondary}
            style={{ marginBottom: 24, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <Plus size={14} /> Thêm phần nội dung
          </button>

          {/* Publish toggle */}
          <div style={{
            padding: 16, marginBottom: 24, borderRadius: 8,
            border: '1px solid var(--vg-ink-200)', background: 'var(--vg-ink-50)',
            display: 'flex', alignItems: 'center', gap: 12
          }}>
            <input type="hidden" name="is_published" value="false" />
            <input
              type="checkbox"
              name="is_published"
              value="true"
              defaultChecked={blog?.is_published ?? true}
              id="publish-toggle"
              style={{ width: 18, height: 18 }}
            />
            <label htmlFor="publish-toggle" style={{ fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              Xuất bản ngay (hiển thị trên trang khách hàng)
            </label>
          </div>

          {state?.error && <p className={shared.formError}>{state.error}</p>}

          <button
            type="submit"
            className={`${shared.btn} ${shared.btnPrimary}`}
            disabled={pending}
            style={{ minWidth: 180 }}
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isEdit ? ' Cập nhật bài viết' : ' Đăng bài viết'}
          </button>
        </form>
      </div>
    </div>
  );
}
