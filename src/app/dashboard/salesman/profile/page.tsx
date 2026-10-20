import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { User, Phone, Briefcase, MapPin, Navigation, Clock, LogOut, CheckCircle2 } from 'lucide-react';
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
    <div className="space-y-6 pb-28 animate-fade-in-up">
      {/* Top Nav */}
      <div className="bg-surface/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sticky top-0 z-20 border-b border-border-subtle/40">
        <h1 className="text-2xl font-black text-text-primary tracking-tight">My Profile</h1>
      </div>

      {/* Main Profile Info */}
      <div className="bg-surface-raised rounded-3xl shadow-raised border border-border-subtle overflow-hidden">
        <div className="p-6 border-b border-border-subtle flex items-center gap-4 bg-brand-teal/5">
          <div className="w-16 h-16 rounded-2xl bg-surface-sunken shadow-inset border border-border-subtle flex items-center justify-center text-brand-teal shrink-0">
            <User className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-black text-text-primary tracking-tight">{salesman.name}</h2>
            <div className="text-xs font-bold text-text-muted mt-0.5">
              Employee ID: <span className="font-mono text-text-secondary">{salesman.employeeCode}</span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-surface-sunken shadow-inset border border-border-subtle flex items-center justify-center shrink-0 text-text-secondary">
              <Phone className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-0.5">Phone Number</div>
              <div className="font-black text-text-primary text-base">{salesman.phone || 'Not available'}</div>
            </div>
          </div>

          <div className="flex items-start gap-4 pt-4 border-t border-border-subtle">
            <div className="w-10 h-10 rounded-2xl bg-surface-sunken shadow-inset border border-border-subtle flex items-center justify-center shrink-0 text-text-secondary">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Account Status</div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shadow-raised-sm ${
                salesman.isActive 
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' 
                  : 'bg-red-500/15 text-accent-terracotta border border-red-500/30'
              }`}>
                <span className={`h-2 w-2 rounded-full ${salesman.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                {salesman.isActive ? 'Active' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Territory Details */}
      <div className="bg-surface-raised rounded-3xl shadow-raised border border-border-subtle p-6 space-y-6">
        <h3 className="font-black text-text-primary text-lg border-b border-border-subtle pb-3 tracking-tight">
          Assigned Territory
        </h3>
        
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-surface-sunken shadow-inset border border-border-subtle flex items-center justify-center shrink-0 text-brand-teal">
            <Navigation className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Routes</div>
            {assignedRoutes.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {assignedRoutes.map((routeName, idx) => (
                  <span 
                    key={idx} 
                    className="inline-flex items-center px-3 py-1 bg-surface-sunken shadow-inset-sm rounded-full text-xs font-bold text-text-secondary border border-border-subtle"
                  >
                    {routeName}
                  </span>
                ))}
              </div>
            ) : (
              <div className="font-bold text-text-muted text-sm">Not available</div>
            )}
          </div>
        </div>

        <div className="flex items-start gap-4 pt-4 border-t border-border-subtle">
          <div className="w-10 h-10 rounded-2xl bg-surface-sunken shadow-inset border border-border-subtle flex items-center justify-center shrink-0 text-brand-teal">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Areas</div>
            {assignedAreas.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {assignedAreas.map((areaName, idx) => (
                  <span 
                    key={idx} 
                    className="inline-flex items-center px-3 py-1 bg-surface-sunken shadow-inset-sm rounded-full text-xs font-bold text-text-secondary border border-border-subtle"
                  >
                    {areaName}
                  </span>
                ))}
              </div>
            ) : (
              <div className="font-bold text-text-muted text-sm">Not available</div>
            )}
          </div>
        </div>
      </div>

      {/* Today's Work Session */}
      <div className="bg-surface-raised rounded-3xl shadow-raised border border-border-subtle p-6 space-y-6">
        <h3 className="font-black text-text-primary text-lg border-b border-border-subtle pb-3 tracking-tight">
          Today&apos;s Work Session
        </h3>
        
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-surface-sunken shadow-inset border border-border-subtle flex items-center justify-center shrink-0 text-brand-teal">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-0.5">Logged in at</div>
              <div className="font-black text-text-primary text-base">
                {workSession?.loginAt ? new Date(workSession.loginAt).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) : '-'}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4 pt-4 border-t border-border-subtle">
            <div className="w-10 h-10 rounded-2xl bg-surface-sunken shadow-inset border border-border-subtle flex items-center justify-center shrink-0 text-brand-teal">
              <LogOut className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-0.5">Logged out at</div>
              <div className="font-black text-text-primary text-base">
                {workSession?.status === 'ACTIVE' ? 'Active' : workSession?.logoutAt ? new Date(workSession.logoutAt).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) : '-'}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4 pt-4 border-t border-border-subtle">
            <div className="w-10 h-10 rounded-2xl bg-surface-sunken shadow-inset border border-border-subtle flex items-center justify-center shrink-0 text-brand-teal">
              <Briefcase className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-0.5">Status</div>
              <div className="font-black text-text-primary text-base">
                {!workSession ? 'Not started' : 
                  workSession.status === 'ACTIVE' ? 'Active' : 
                  workSession.status === 'FORCE_CLOSED' ? 'Automatically logged out' : 
                  'Logged out'}
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
