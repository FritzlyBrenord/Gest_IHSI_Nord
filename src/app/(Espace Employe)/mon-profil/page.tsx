'use client';

import { ProfilePage } from '@/components/profile/profile-page';

export default function EmployeProfilePage() {
  return <ProfilePage fallbackRoute="/home" headingLabel="Profil employé" />;
}
