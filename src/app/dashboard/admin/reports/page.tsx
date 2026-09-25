import { redirect } from 'next/navigation';

export default function ReportsRootPage() {
  redirect('/dashboard/admin/reports/daily');
}
