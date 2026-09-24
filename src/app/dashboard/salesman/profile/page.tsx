import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { User, Phone, Briefcase, MapPin, Navigation, Clock, LogOut, CheckCircle2, XCircle } from 'lucide-react';
import { getKolkataDateOnly, getCurrentKolkataTime } from '@/lib/time';
import LogoutButton from './LogoutButton';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'SALESMAN') {
    redirect('/login');
  }

  const salesman = await prisma.salesman.findUnique({
    where: { profileId: session.user.id },
    include: {
      routes: true,
      assignments: {
        include: {
          route: true,
          area: true
        }
      }
    }
  });

  if (!salesman) {
    redirect('/login');
  }

  // Get today's work session if any
  const workDate = getKolkataDateOnly(getCurrentKolkataTime());
  const workSession = await prisma.workSession.findUnique({
    where: {
      salesmanId_workDate: {
        salesmanId: salesman.id,
        workDate
      }
    }
  });

  const assignedRoutes = Array.from(new Set(salesman.assignments.map(a => a.route.name)));
  const assignedAreas = Array.from(new Set(salesman.assignments.map(a => a.area.name)));

  return (
    <div className="space-y-6 pb-24 animate-fade-in-up">
      {/* Top Nav */}
      <div className="bg-slate-50 dark:bg-slate-900 pt-2 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sticky top-0 z-20">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">My Profile</h1>
      </div>

      <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-alvoun-blue/10 flex items-center justify-center shrink-0">
            <User className="h-7 w-7 text-alvoun-blue" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{salesman.name}</h2>
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Employee ID: {salesman.employeeCode}</div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0">
              <Phone className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Phone Number</div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-base">{salesman.phone || 'Not available'}</div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Account Status</div>
              <div className={`font-bold text-base ${salesman.isActive ? 'text-alvoun-green' : 'text-alvoun-red'}`}>
                {salesman.isActive ? 'Active' : 'Disabled'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Territory Details */}
      <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-6">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg border-b border-slate-100 dark:border-slate-800 pb-4">Assigned Territory</h3>
        
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0">
            <Navigation className="h-5 w-5 text-alvoun-blue" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Routes</div>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-base">
              {assignedRoutes.length > 0 ? assignedRoutes.join(', ') : 'Not available'}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0">
            <MapPin className="h-5 w-5 text-alvoun-blue" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Areas</div>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-base leading-snug">
              {assignedAreas.length > 0 ? assignedAreas.join(', ') : 'Not available'}
            </div>
          </div>
        </div>
      </div>

      {/* Today's Work Session */}
      <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-6">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg border-b border-slate-100 dark:border-slate-800 pb-4">Today's Session</h3>
        
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0">
            <Briefcase className="h-5 w-5 text-alvoun-blue" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Session Status</div>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-base">
              {!workSession ? 'Not started' : workSession.status === 'ACTIVE' ? 'Active' : 'Closed'}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5 text-alvoun-blue" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between mb-2">
              <div>
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Login Time</div>
                <div className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  {workSession?.loginAt ? new Date(workSession.loginAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Not available'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Logout Time</div>
                <div className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  {workSession?.logoutAt ? new Date(workSession.logoutAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Not available'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Action */}
      <LogoutButton />
    </div>
  );
}
