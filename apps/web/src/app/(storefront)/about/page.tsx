'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Leaf,
  Heart,
  Sparkles,
  ShieldCheck,
  Globe2,
  Award,
  ArrowRight,
  CheckCircle2,
  Recycle,
  Flower2,
  HandHeart,
} from 'lucide-react';
import styles from './about.module.css';

const VALUES = [
  {
    icon: <Leaf size={26} />,
    title: '100% Thuần chay',
    desc: 'Không chứa thành phần từ động vật. Chiết xuất hoàn toàn từ thực vật và khoáng tự nhiên.',
  },
  {
    icon: <HandHeart size={26} />,
    title: 'Cruelty-Free',
    desc: 'Cam kết không thử nghiệm trên động vật ở mọi giai đoạn nghiên cứu và sản xuất.',
  },
  {
    icon: <Recycle size={26} />,
    title: 'Bền vững & Tái chế',
    desc: 'Bao bì làm từ vật liệu tái chế, mực in đậu nành, có thể phân hủy sinh học.',
  },
  {
    icon: <ShieldCheck size={26} />,
    title: 'An toàn cho da',
    desc: 'Đã kiểm nghiệm da liễu, không paraben, không sulfate, không silicon, không hương liệu nhân tạo.',
  },
];

const TIMELINE = [
  {
    year: '2021',
    title: 'Khởi đầu từ phòng thí nghiệm nhỏ',
    desc: 'Hai dược sĩ trẻ Việt Nam nung nấu ý tưởng làm mỹ phẩm thuần chay từ rau má, trà xanh, diếp cá — những thảo dược quen thuộc của bà của mẹ.',
  },
  {
    year: '2022',
    title: 'Ra mắt 3 sản phẩm đầu tiên',
    desc: 'Serum Rau Má Phục Hồi, Toner Diếp Cá Kiềm Dầu, Kem Chống Nắng Trà Xanh — bán hết 1.200 chai trong 2 tháng.',
  },
  {
    year: '2023',
    title: 'Đạt chứng nhận Vegan & Cruelty-Free',
    desc: 'Trở thành một trong số ít thương hiệu mỹ phẩm Việt Nam được Vegan Society công nhận chính thức.',
  },
  {
    year: '2024',
    title: 'Mở rộng ra toàn quốc',
    desc: 'Hơn 200 đại lý phân phối tại 35 tỉnh thành. Phục vụ hơn 50.000 khách hàng trung thành.',
  },
  {
    year: '2025',
    title: 'Hệ thống quản lý số hóa',
    desc: 'Triển khai nền tảng TMĐT B2C tích hợp CRM, kho thông minh và quản trị tập trung — chuẩn hóa vận hành.',
  },
];

const STATS = [
  { value: '50K+', label: 'Khách hàng tin dùng' },
  { value: '24', label: 'Sản phẩm thuần chay' },
  { value: '100%', label: 'Nguyên liệu thực vật' },
  { value: '0', label: 'Thử nghiệm trên động vật' },
];

const INGREDIENTS = [
  { name: 'Rau Má', desc: 'Chiết xuất từ Centella Asiatica — phục hồi và làm dịu da.' },
  { name: 'Trà Xanh', desc: 'Chống oxy hóa mạnh, bảo vệ da khỏi tia UV và ô nhiễm.' },
  { name: 'Diếp Cá', desc: 'Kiềm dầu, ngừa mụn tự nhiên — bí quyết của mẹ Việt Nam.' },
  { name: 'Tràm Trà', desc: 'Kháng khuẩn dịu nhẹ, hỗ trợ làn da khỏe mạnh từ bên trong.' },
];

const TEAM = [
  {
    name: 'Trần Thảo My',
    role: 'CEO & Co-founder',
    initials: 'TTM',
    bio: 'Người đặt nền móng cho sứ mệnh thuần chay của VeganGlow, với tầm nhìn mang thảo dược Việt ra thế giới.',
  },
  {
    name: 'Huỳnh Nguyễn Quốc Việt',
    role: 'CTO & Lead Developer',
    initials: 'HNV',
    bio: 'Kiến trúc sư trưởng của hệ thống, người đảm bảo trải nghiệm mua sắm mượt mà và hiện đại trên mọi thiết bị.',
  },
  {
    name: 'Phạm Hoài Thương',
    role: 'Operations Manager',
    initials: 'PHT',
    bio: 'Quản lý vận hành và chuỗi cung ứng, đảm bảo từng sản phẩm được đóng gói và giao đến tay khách hàng hoàn hảo nhất.',
  },
  {
    name: 'Trần Quỳnh Trâm',
    role: 'Technical Lead & Security',
    initials: 'TQT',
    bio: 'Chuyên gia phụ trách hạ tầng kỹ thuật và bảo mật thông tin, bảo vệ dữ liệu và quyền riêng tư của khách hàng.',
  },
];

export default function AboutPage() {
  return (
    <div className={styles.page}>
      {/* HERO */}
      <motion.section
        className={styles.hero}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className={styles.eyebrow}>
          <Leaf size={14} /> Mỹ phẩm thuần chay Việt Nam
        </div>
        <h1 className={styles.title}>
          Vẻ đẹp tự nhiên,
          <br />
          <span className={styles.titleAccent}>nâng niu thiên nhiên</span>
        </h1>
        <p className={styles.lead}>
          <strong>VeganGlow</strong> sinh ra từ niềm tin rằng làn da đẹp không cần đánh đổi
          bằng môi trường hay sự sống. Chúng tôi mang đến mỹ phẩm thuần chay làm từ thảo
          dược Việt Nam — an toàn cho bạn, dịu dàng với địa cầu.
        </p>
      </motion.section>

      {/* STATS */}
      <motion.div
        className={styles.statsBar}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
      >
        {STATS.map((s) => (
          <div key={s.label} className={styles.statCell}>
            <span className={styles.statValue}>{s.value}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </motion.div>

      {/* MISSION */}
      <motion.section
        className={styles.missionSection}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.missionGrid}>
          <div className={styles.missionCard}>
            <span className={styles.missionIcon}>
              <Heart size={22} />
            </span>
            <h3 className={styles.missionTitle}>Sứ mệnh</h3>
            <p className={styles.missionText}>
              Chứng minh rằng mỹ phẩm Việt Nam có thể vừa tinh tế, vừa bền vững — không
              cần dùng tới một giọt nguyên liệu từ động vật để có làn da khỏe đẹp.
            </p>
          </div>
          <div className={styles.missionCard}>
            <span className={styles.missionIcon}>
              <Globe2 size={22} />
            </span>
            <h3 className={styles.missionTitle}>Tầm nhìn</h3>
            <p className={styles.missionText}>
              Trở thành thương hiệu mỹ phẩm thuần chay hàng đầu Đông Nam Á đến năm 2030,
              đưa thảo dược Việt ra thế giới với cam kết zero animal testing.
            </p>
          </div>
          <div className={styles.missionCard}>
            <span className={styles.missionIcon}>
              <Award size={22} />
            </span>
            <h3 className={styles.missionTitle}>Cam kết</h3>
            <p className={styles.missionText}>
              Mỗi sản phẩm đều được kiểm nghiệm da liễu độc lập và đạt chuẩn Vegan
              Society. 1% doanh thu được trích cho các quỹ bảo tồn động vật.
            </p>
          </div>
        </div>
      </motion.section>

      {/* VALUES */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
      >
        <h2 className={styles.sectionTitle}>
          <Sparkles size={28} className={styles.sectionIcon} />
          Giá trị cốt lõi
        </h2>
        <p className={styles.sectionSubtitle}>
          Bốn nguyên tắc dẫn đường mọi quyết định, từ phòng nghiên cứu đến đôi bàn tay khách hàng
        </p>

        <div className={styles.valuesGrid}>
          {VALUES.map((v, idx) => (
            <motion.div
              key={v.title}
              className={styles.valueCard}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{
                delay: idx * 0.08,
                duration: 0.5,
                ease: [0.34, 1.56, 0.64, 1],
              }}
            >
              <div className={styles.valueIcon}>{v.icon}</div>
              <div className={styles.valueTitle}>{v.title}</div>
              <p className={styles.valueDesc}>{v.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* TEAM */}
      <motion.section
        className={styles.teamSection}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
      >
        <h2 className={styles.sectionTitle}>Đội ngũ sáng lập</h2>
        <p className={styles.sectionSubtitle}>
          Những người trẻ tâm huyết đứng sau hành trình xanh của VeganGlow
        </p>

        <div className={styles.teamGrid}>
          {TEAM.map((m, idx) => (
            <motion.div
              key={m.name}
              className={styles.teamCard}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
            >
              <div className={styles.teamAvatar}>
                {m.initials}
              </div>
              <h3 className={styles.teamName}>{m.name}</h3>
              <div className={styles.teamRole}>{m.role}</div>
              <p className={styles.teamBio}>{m.bio}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* TIMELINE */}
      <motion.section
        className={styles.timelineSection}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
      >
        <h2 className={styles.sectionTitle}>Hành trình của chúng tôi</h2>
        <p className={styles.sectionSubtitle}>
          Từ một phòng thí nghiệm nhỏ đến thương hiệu được tin yêu trên toàn quốc
        </p>

        <div className={styles.timeline}>
          {TIMELINE.map((item, idx) => (
            <motion.div
              key={item.year}
              className={styles.timelineItem}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
            >
              <div className={styles.timelineMarker}>
                <span className={styles.timelineDot} />
                <span className={styles.timelineYear}>{item.year}</span>
              </div>
              <div className={styles.timelineContent}>
                <h4 className={styles.timelineTitle}>{item.title}</h4>
                <p className={styles.timelineDesc}>{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>


      {/* INGREDIENTS */}
      <motion.section
        className={styles.ingredientsSection}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6 }}
      >
        <h2 className={styles.sectionTitle}>
          <Flower2 size={28} className={styles.sectionIcon} />
          Bốn loại thảo dược kim chỉ nam
        </h2>
        <p className={styles.sectionSubtitle}>
          Những nguyên liệu Việt Nam quen thuộc, được khoa học chứng minh hiệu quả
        </p>

        <div className={styles.ingredientsGrid}>
          {INGREDIENTS.map((ing, idx) => (
            <motion.div
              key={ing.name}
              className={styles.ingredientCard}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05, duration: 0.4 }}
              whileHover={{ y: -6 }}
            >
              <div className={styles.ingredientIcon}>
                <Leaf size={22} />
              </div>
              <div className={styles.ingredientName}>{ing.name}</div>
              <div className={styles.ingredientDesc}>{ing.desc}</div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* CTA */}
      <motion.section
        className={styles.ctaSection}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6 }}
      >
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>Bắt đầu hành trình thuần chay cùng VeganGlow</h2>
          <p className={styles.ctaText}>
            Khám phá bộ sưu tập sản phẩm chiết xuất từ thảo dược Việt — an toàn cho da bạn,
            dịu dàng với hành tinh.
          </p>
          <div className={styles.ctaActions}>
            <Link href="/products" className={styles.ctaPrimary}>
              Xem sản phẩm <ArrowRight size={16} />
            </Link>
            <Link href="/contact" className={styles.ctaSecondary}>
              Liên hệ với chúng tôi
            </Link>
          </div>
          <div className={styles.ctaCheck}>
            <CheckCircle2 size={14} /> Miễn phí giao hàng cho đơn từ 500.000đ
          </div>
        </div>
      </motion.section>
    </div>
  );
}
