'use client';

import UserAccountSidebar from './UserAccountSidebar';
import styles from './UserAccountLayout.module.css';
import { motion } from 'framer-motion';

export default function UserAccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`container ${styles.accountWrapper}`}>
      <div className={styles.layoutGrid}>
        <UserAccountSidebar />
        <motion.main 
          className={styles.mainContent}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
