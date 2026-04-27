'use client';

import { motion } from 'framer-motion';
import {
  User,
  Hash,
  Phone,
  Mail,
  GraduationCap,
  Github,
  Database,
  Cloud,
  Server,
  Box,
  ShieldCheck,
  Sparkles,
  Users as UsersIcon,
} from 'lucide-react';
import styles from './about.module.css';

type FieldKey =
  | 'fullName'
  | 'mssv'
  | 'phone'
  | 'emailPersonal'
  | 'emailSchool'
  | 'github'
  | 'supabase'
  | 'vercel'
  | 'redis'
  | 'docker'
  | 'snyk';

type Member = {
  role: string;
  initial: string;
  fields: Partial<Record<FieldKey, string>>;
};

const FIELD_CONFIG: { key: FieldKey; label: string; icon: React.ReactNode; group: 'personal' | 'tech' }[] = [
  { key: 'fullName', label: 'Họ và Tên', icon: <User size={14} />, group: 'personal' },
  { key: 'mssv', label: 'MSSV', icon: <Hash size={14} />, group: 'personal' },
  { key: 'phone', label: 'SĐT', icon: <Phone size={14} />, group: 'personal' },
  { key: 'emailPersonal', label: 'Mail cá nhân', icon: <Mail size={14} />, group: 'personal' },
  { key: 'emailSchool', label: 'Mail trường', icon: <GraduationCap size={14} />, group: 'personal' },
  { key: 'github', label: 'GitHub', icon: <Github size={14} />, group: 'tech' },
  { key: 'supabase', label: 'Supabase', icon: <Database size={14} />, group: 'tech' },
  { key: 'vercel', label: 'Vercel', icon: <Cloud size={14} />, group: 'tech' },
  { key: 'redis', label: 'Redis', icon: <Server size={14} />, group: 'tech' },
  { key: 'docker', label: 'Docker', icon: <Box size={14} />, group: 'tech' },
  { key: 'snyk', label: 'Snyk', icon: <ShieldCheck size={14} />, group: 'tech' },
];

// Cấu hình nhóm 4 thành viên — các field để trống cho từng người tự điền vào
const MEMBERS: Member[] = [
  {
    role: 'Thành viên 1 — Frontend Lead',
    initial: '1',
    fields: {},
  },
  {
    role: 'Thành viên 2 — Backend & DB',
    initial: '2',
    fields: {},
  },
  {
    role: 'Thành viên 3 — DevOps & Deploy',
    initial: '3',
    fields: {},
  },
  {
    role: 'Thành viên 4 — UI/UX & QA',
    initial: '4',
    fields: {},
  },
];

const TECH_STACK = [
  { name: 'GitHub', desc: 'Source control & CI', icon: <Github size={26} /> },
  { name: 'Supabase', desc: 'Postgres + Auth + RLS', icon: <Database size={26} /> },
  { name: 'Vercel', desc: 'Hosting & Edge CDN', icon: <Cloud size={26} /> },
  { name: 'Redis (Upstash)', desc: 'Cache phân tán', icon: <Server size={26} /> },
  { name: 'Docker', desc: 'Container hóa môi trường', icon: <Box size={26} /> },
  { name: 'Snyk', desc: 'Bảo mật & vulnerability scan', icon: <ShieldCheck size={26} /> },
];

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <motion.section
        className={styles.hero}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className={styles.eyebrow}>
          <Sparkles size={14} /> Demo QTHTTT
        </div>
        <h1 className={styles.title}>
          Nhóm Quản trị Hệ thống <br />
          Thông tin <span className={styles.titleAccent}>VeganGlow</span>
        </h1>
        <p className={styles.lead}>
          Trang demo của nhóm 4 thành viên — xây dựng và triển khai một hệ thống TMĐT B2C
          thực tế cho doanh nghiệp giả định <strong>VeganGlow</strong> (mỹ phẩm thuần chay
          Việt Nam). Mỗi thành viên đảm nhận một mảng nghiệp vụ và một role triển khai
          trên hạ tầng đám mây.
        </p>
      </motion.section>

      <motion.div
        className={styles.statsBar}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
      >
        <div className={styles.statCell}>
          <span className={styles.statValue}>4</span>
          <span className={styles.statLabel}>Thành viên</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statValue}>6</span>
          <span className={styles.statLabel}>Dịch vụ Cloud</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statValue}>3</span>
          <span className={styles.statLabel}>Tier (Web/Mobile/BE)</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statValue}>100%</span>
          <span className={styles.statLabel}>Stack hiện đại</span>
        </div>
      </motion.div>

      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
      >
        <h2 className={styles.sectionTitle}>
          <UsersIcon size={28} style={{ display: 'inline', marginRight: 8, verticalAlign: -4, color: '#10b981' }} />
          Đội ngũ phát triển
        </h2>
        <p className={styles.sectionSubtitle}>
          Các trường thông tin để trống bên dưới — mỗi thành viên tự điền dữ liệu cá nhân và
          các tài khoản dịch vụ đã đăng ký để phục vụ deploy.
        </p>

        <div className={styles.teamGrid}>
          {MEMBERS.map((member, idx) => (
            <motion.div
              key={idx}
              className={styles.memberCard}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ delay: idx * 0.08, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <div className={styles.memberHeader}>
                <div className={styles.memberAvatar}>{member.initial}</div>
                <div>
                  <span className={styles.memberRoleBadge}>{member.role}</span>
                  <div className={styles.memberPlaceholder}>(Chưa điền tên)</div>
                </div>
              </div>

              <div className={styles.subSectionTitle}>Thông tin cá nhân</div>
              <div className={styles.fieldGrid}>
                {FIELD_CONFIG.filter((f) => f.group === 'personal').map((field) => (
                  <div key={field.key} className={styles.fieldRow}>
                    <span className={styles.fieldIcon}>{field.icon}</span>
                    <span className={styles.fieldLabel}>{field.label}:</span>
                    {member.fields[field.key] ? (
                      <span className={styles.fieldValue}>{member.fields[field.key]}</span>
                    ) : (
                      <span className={styles.fieldEmpty}>____________</span>
                    )}
                  </div>
                ))}
              </div>

              <div className={styles.divider} />

              <div className={styles.subSectionTitle}>Tài khoản dịch vụ Deploy</div>
              <div className={styles.fieldGrid}>
                {FIELD_CONFIG.filter((f) => f.group === 'tech').map((field) => (
                  <div key={field.key} className={styles.fieldRow}>
                    <span className={styles.fieldIcon}>{field.icon}</span>
                    <span className={styles.fieldLabel}>{field.label}:</span>
                    {member.fields[field.key] ? (
                      <span className={styles.fieldValue}>{member.fields[field.key]}</span>
                    ) : (
                      <span className={styles.fieldEmpty}>____________</span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section
        className={styles.techSection}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6 }}
      >
        <h2 className={styles.sectionTitle}>Hạ tầng triển khai</h2>
        <p className={styles.sectionSubtitle}>
          6 dịch vụ chính dùng trong demo — mỗi thành viên đăng ký tài khoản và quản lý role tương ứng
        </p>

        <div className={styles.techGrid}>
          {TECH_STACK.map((tech, idx) => (
            <motion.div
              key={tech.name}
              className={styles.techCard}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05, duration: 0.4 }}
              whileHover={{ y: -6 }}
            >
              <div className={styles.techIcon}>{tech.icon}</div>
              <div className={styles.techName}>{tech.name}</div>
              <div className={styles.techDesc}>{tech.desc}</div>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
