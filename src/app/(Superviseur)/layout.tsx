import { SuperviseurFrame } from '@/components/superviseur/superviseur-frame';

export default function SuperviseurLayout({ children }: { children: React.ReactNode }) {
  return <SuperviseurFrame>{children}</SuperviseurFrame>;
}
