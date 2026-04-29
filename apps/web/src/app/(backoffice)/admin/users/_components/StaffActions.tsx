'use client';

import { useTransition } from 'react';
import { UserMinus, UserCheck, Loader2 } from 'lucide-react';
import { toggleStaffStatus } from '@/app/actions/admin/profile';
import shared from '../../admin-shared.module.css';

export function StaffActions({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, start] = useTransition();

  function toggle() {
    if (
      isActive &&
      !confirm('Vô hiệu hóa nhân sự này? Họ sẽ mất quyền truy cập admin.')
    ) {
      return;
    }
    start(async () => {
      await toggleStaffStatus(id, !isActive);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`${shared.btn} ${shared.btnGhost} ${shared.btnIcon}`}
      aria-label={isActive ? 'Vô hiệu hóa' : 'Kích hoạt lại'}
      title={isActive ? 'Vô hiệu hóa' : 'Kích hoạt lại'}
    >
      {pending ? <Loader2 size={14} /> : isActive ? <UserMinus size={14} /> : <UserCheck size={14} />}
    </button>
  );
}
