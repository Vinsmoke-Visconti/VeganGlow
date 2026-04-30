'use client';

import { Sparkles, Github, Server, Database, Cloud, Shield, Mail, GraduationCap } from 'lucide-react';
import shared from '../../admin-shared.module.css';
import styles from './team.module.css';

export function TeamMembersClient() {
  const AUTHORS = [
    {
      id: 'author-1',
      full_name: 'Trần Thảo My',
      mssv: '52300129',
      mail_can_han: 'pascallaem@gmail.com',
      mail_truong: '52300129@student.tdtu.edu.vn',
      github: 'tranthaomy901',
      supabase: 'tranthaomy901',
      vercel: 'tranthaomy901',
      redis: '22 .Trần Thảo',
      docker: 'tranthaomy901',
      snyk: 'tranthaomy901',
      role_label: 'Hệ thống & Vận hành',
    },
    {
      id: 'author-2',
      full_name: 'Huỳnh Nguyễn Quốc Việt',
      mssv: '52300267',
      mail_can_han: 'quocvietcndc@gmail.com',
      mail_truong: '52300267@student.tdtu.edu.vn',
      github: 'Vinsmoke-Visconti',
      supabase: 'Vinsmoke-Visconti',
      vercel: 'vinsmoke-visconti',
      redis: 'viet quoc',
      docker: 'viscontivinsmoke',
      snyk: 'Vinsmoke-Visconti',
      role_label: 'Kiến trúc & Bảo mật',
    },
    {
      id: 'author-3',
      full_name: 'Phạm Hoài Thương',
      mssv: '52300262',
      mail_can_han: 'binmin81@gmail.com',
      mail_truong: '52300262@student.tdtu.edu.vn',
      github: 'Terrykozte',
      supabase: 'Terrykozte',
      vercel: 'Terrykozte',
      redis: 'Terrykozte',
      docker: 'Terrykozte',
      snyk: 'Terrykozte',
      role_label: 'Phát triển Sản phẩm',
    },
    {
      id: 'author-4',
      full_name: 'Thành viên 4 (Đang cập nhật)',
      mssv: 'Đang cập nhật',
      mail_can_han: 'Đang cập nhật',
      mail_truong: 'Đang cập nhật',
      github: 'Đang cập nhật',
      supabase: 'Đang cập nhật',
      vercel: 'Đang cập nhật',
      redis: 'Đang cập nhật',
      docker: 'Đang cập nhật',
      snyk: 'Đang cập nhật',
      role_label: 'Cố vấn / QA',
    }
  ];

  const SERVICES = ['github', 'supabase', 'vercel', 'redis', 'docker', 'snyk'] as const;
  const SERVICE_ICON: Record<string, React.ReactNode> = {
    github: <Github size={12} />,
    supabase: <Database size={12} />,
    vercel: <Cloud size={12} />,
    redis: <Server size={12} />,
    docker: <Cloud size={12} />,
    snyk: <Shield size={12} />,
  };

  return (
    <>
      {/* Header Banner */}
      <div className={styles.banner}>
        <div className={styles.bannerContent}>
          <div className={styles.bannerBadge}>
            <Sparkles size={12} /> BẢN QUYỀN DEMO SỞ HỮU TRÍ TUỆ
          </div>
          <h2 className={styles.bannerTitle}>Hệ thống VeganGlow</h2>
          <p className={styles.bannerText}>
            Sản phẩm demo MIS — TDTU. Mọi sao chép mã nguồn, giao diện khi chưa có sự đồng ý của tác giả đều vi phạm bản quyền.
          </p>
        </div>
      </div>

      {/* 4 Member Cards — 2x2 grid, no scroll */}
      <div className={styles.grid}>
        {AUTHORS.map((m) => (
          <div key={m.id} className={styles.card}>
            {/* Header */}
            <div className={styles.cardHead}>
              <div className={styles.avatar}>{m.full_name.charAt(0)}</div>
              <div className={styles.cardHeadText}>
                <h4 className={styles.cardName}>{m.full_name}</h4>
                <span className={styles.cardRole}>{m.role_label}</span>
              </div>
            </div>

            {/* Info rows — compact */}
            <div className={styles.infoGrid}>
              <div className={styles.infoRow}>
                <GraduationCap size={12} />
                <span className={styles.infoLabel}>MSSV</span>
                <span className={styles.infoValue}>{m.mssv}</span>
              </div>
              <div className={styles.infoRow}>
                <Mail size={12} />
                <span className={styles.infoLabel}>Email trường</span>
                <span className={styles.infoValue}>{m.mail_truong}</span>
              </div>
              <div className={styles.infoRow}>
                <Mail size={12} />
                <span className={styles.infoLabel}>Email cá nhân</span>
                <span className={styles.infoValue}>{m.mail_can_han}</span>
              </div>
            </div>

            {/* Service tags — compact row */}
            <div className={styles.serviceTags}>
              {SERVICES.map((svc) => (
                <span key={svc} className={styles.serviceTag}>
                  {SERVICE_ICON[svc]}
                  <span>{(m as Record<string, string>)[svc]}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
