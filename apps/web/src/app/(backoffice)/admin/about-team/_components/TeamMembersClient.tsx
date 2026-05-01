'use client';
 
import { Sparkles, Github, Server, Database, Cloud, Shield, Mail, GraduationCap, Copy } from 'lucide-react';
import { toast } from 'sonner';
import styles from './team.module.css';

export function TeamMembersClient() {
  const SERVICE_URLS: Record<string, string> = {
    github: 'github.com/',
    supabase: 'supabase.com/dashboard/project/',
    vercel: 'vercel.com/',
    redis: 'upstash.com/',
    docker: 'hub.docker.com/u/',
    snyk: 'app.snyk.io/org/',
  };

  const handleCopy = (text: string, label: string, service?: string) => {
    if (!text || text === 'Đang cập nhật') return;
    
    let copyText = text;
    let toastLabel = `${label} ${text}`;

    if (service && SERVICE_URLS[service]) {
      copyText = `${SERVICE_URLS[service]}${text}`;
      const serviceName = service.charAt(0).toUpperCase() + service.slice(1);
      toastLabel = `${serviceName} ${text}`;
    }

    navigator.clipboard.writeText(copyText);
    toast.success(`Đã sao chép ${toastLabel}`);
  };

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

      <div className={styles.grid}>
        {AUTHORS.map((m) => (
          <div key={m.id} className={styles.card}>
            <div className={styles.cardHead}>
              <div className={styles.avatar}>{m.full_name.charAt(0)}</div>
              <div className={styles.cardHeadText}>
                <h4 className={styles.cardName}>{m.full_name}</h4>
              </div>
            </div>

            <div className={styles.infoGrid}>
              <button 
                className={styles.infoRow}
                onClick={() => handleCopy(m.mssv, 'MSSV')}
              >
                <GraduationCap size={12} />
                <span className={styles.infoLabel}>MSSV</span>
                <span className={styles.infoValue}>{m.mssv}</span>
                <Copy size={12} className={styles.copyIcon} />
              </button>
              <button 
                className={styles.infoRow}
                onClick={() => handleCopy(m.mail_truong, 'Email trường')}
              >
                <Mail size={12} />
                <span className={styles.infoLabel}>Email trường</span>
                <span className={styles.infoValue}>{m.mail_truong}</span>
                <Copy size={12} className={styles.copyIcon} />
              </button>
              <button 
                className={styles.infoRow}
                onClick={() => handleCopy(m.mail_can_han, 'Email cá nhân')}
              >
                <Mail size={12} />
                <span className={styles.infoLabel}>Email cá nhân</span>
                <span className={styles.infoValue}>{m.mail_can_han}</span>
                <Copy size={12} className={styles.copyIcon} />
              </button>
            </div>

            <div className={styles.serviceTags}>
              {SERVICES.map((svc) => {
                const username = (m as Record<string, string>)[svc];
                if (!username || username === 'Đang cập nhật') return null;

                return (
                  <button 
                    key={svc} 
                    className={styles.serviceTag}
                    onClick={() => handleCopy(username, svc.toUpperCase(), svc)}
                  >
                    {SERVICE_ICON[svc]}
                    <span>{username}</span>
                    <Copy size={10} className={styles.copyIconMini} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
