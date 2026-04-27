'use client';

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
  Users as UsersIcon,
  Sparkles,
  Code2,
  Layers,
} from 'lucide-react';
import sharedStyles from '../admin-shared.module.css';
import styles from './about-team.module.css';

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

const FIELD_CONFIG: {
  key: FieldKey;
  label: string;
  icon: React.ReactNode;
  group: 'personal' | 'tech';
}[] = [
  { key: 'fullName', label: 'Họ và tên', icon: <User size={14} />, group: 'personal' },
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

const MEMBERS: Member[] = [
  { role: 'Frontend Lead', initial: '1', fields: {} },
  { role: 'Backend & Database', initial: '2', fields: {} },
  { role: 'DevOps & Deploy', initial: '3', fields: {} },
  { role: 'UI/UX & QA', initial: '4', fields: {} },
];

const TECH_STACK = [
  { name: 'GitHub', desc: 'Source control & CI/CD', icon: <Github size={20} /> },
  { name: 'Supabase', desc: 'Postgres + Auth + RLS', icon: <Database size={20} /> },
  { name: 'Vercel', desc: 'Hosting & Edge CDN', icon: <Cloud size={20} /> },
  { name: 'Redis (Upstash)', desc: 'Cache phân tán', icon: <Server size={20} /> },
  { name: 'Docker', desc: 'Container hóa môi trường', icon: <Box size={20} /> },
  { name: 'Snyk', desc: 'Bảo mật & vulnerability scan', icon: <ShieldCheck size={20} /> },
];

export default function AdminAboutTeam() {
  return (
    <div className={sharedStyles.page}>
      <header className={sharedStyles.pageHeader}>
        <div>
          <h1 className={sharedStyles.pageTitle}>Tác giả & Đội phát triển</h1>
          <p className={sharedStyles.pageSubtitle}>
            Trang ghi nhận đội ngũ xây dựng hệ thống VeganGlow MIS — môn Quản trị Hệ thống
            Thông tin. Mỗi thành viên phụ trách một mảng nghiệp vụ và một role triển khai.
          </p>
        </div>
        <div className={styles.eyebrow}>
          <Sparkles size={14} /> Demo QTHTTT
        </div>
      </header>

      {/* Summary stat row */}
      <div className={sharedStyles.statsRow}>
        <div className={sharedStyles.statCard}>
          <div className={sharedStyles.statLabel}>Thành viên</div>
          <div className={sharedStyles.statValue}>4</div>
        </div>
        <div className={sharedStyles.statCard}>
          <div className={sharedStyles.statLabel}>Dịch vụ Cloud</div>
          <div className={sharedStyles.statValue}>6</div>
        </div>
        <div className={sharedStyles.statCard}>
          <div className={sharedStyles.statLabel}>Tier triển khai</div>
          <div className={sharedStyles.statValue}>3</div>
        </div>
        <div className={sharedStyles.statCard}>
          <div className={sharedStyles.statLabel}>Module hoàn thành</div>
          <div className={sharedStyles.statValue}>7</div>
        </div>
      </div>

      {/* Team grid */}
      <section>
        <h2 className={styles.sectionTitle}>
          <UsersIcon size={20} className={styles.sectionIcon} />
          Đội ngũ phát triển
        </h2>
        <p className={styles.sectionDesc}>
          Các trường thông tin để trống — mỗi thành viên tự điền dữ liệu cá nhân và tài
          khoản dịch vụ deploy.
        </p>

        <div className={styles.teamGrid}>
          {MEMBERS.map((member, idx) => (
            <div key={idx} className={styles.memberCard}>
              <div className={styles.memberHeader}>
                <div className={styles.memberAvatar}>{member.initial}</div>
                <div className={styles.memberHeaderText}>
                  <span className={styles.memberRoleBadge}>{member.role}</span>
                  <div className={styles.memberPlaceholder}>
                    {member.fields.fullName || '(Chưa điền tên)'}
                  </div>
                </div>
              </div>

              <div className={styles.subSectionTitle}>Thông tin cá nhân</div>
              <div className={styles.fieldGrid}>
                {FIELD_CONFIG.filter((f) => f.group === 'personal').map((field) => (
                  <div key={field.key} className={styles.fieldRow}>
                    <span className={styles.fieldIcon}>{field.icon}</span>
                    <span className={styles.fieldLabel}>{field.label}</span>
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
                    <span className={styles.fieldLabel}>{field.label}</span>
                    {member.fields[field.key] ? (
                      <span className={styles.fieldValue}>{member.fields[field.key]}</span>
                    ) : (
                      <span className={styles.fieldEmpty}>____________</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tech stack */}
      <section className={styles.techSection}>
        <h2 className={styles.sectionTitle}>
          <Layers size={20} className={styles.sectionIcon} />
          Hạ tầng triển khai
        </h2>
        <p className={styles.sectionDesc}>
          6 dịch vụ chính được sử dụng — mỗi thành viên đăng ký tài khoản và quản lý role
          tương ứng.
        </p>

        <div className={styles.techGrid}>
          {TECH_STACK.map((tech) => (
            <div key={tech.name} className={styles.techCard}>
              <div className={styles.techIcon}>{tech.icon}</div>
              <div className={styles.techName}>{tech.name}</div>
              <div className={styles.techDesc}>{tech.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Project info */}
      <section className={styles.projectSection}>
        <h2 className={styles.sectionTitle}>
          <Code2 size={20} className={styles.sectionIcon} />
          Thông tin dự án
        </h2>
        <div className={styles.projectGrid}>
          <div className={styles.projectItem}>
            <span className={styles.projectLabel}>Tên dự án</span>
            <span className={styles.projectValue}>VeganGlow — TMĐT Mỹ phẩm thuần chay</span>
          </div>
          <div className={styles.projectItem}>
            <span className={styles.projectLabel}>Môn học</span>
            <span className={styles.projectValue}>Quản trị Hệ thống Thông tin (MIS)</span>
          </div>
          <div className={styles.projectItem}>
            <span className={styles.projectLabel}>Loại hệ thống</span>
            <span className={styles.projectValue}>B2C E-Commerce + CRM tích hợp</span>
          </div>
          <div className={styles.projectItem}>
            <span className={styles.projectLabel}>Stack</span>
            <span className={styles.projectValue}>
              Next.js 16 · Supabase · Capacitor · Docker
            </span>
          </div>
          <div className={styles.projectItem}>
            <span className={styles.projectLabel}>Năm thực hiện</span>
            <span className={styles.projectValue}>2026</span>
          </div>
          <div className={styles.projectItem}>
            <span className={styles.projectLabel}>Repo / Demo</span>
            <span className={styles.projectValueMuted}>(điền khi nộp)</span>
          </div>
        </div>
      </section>
    </div>
  );
}
