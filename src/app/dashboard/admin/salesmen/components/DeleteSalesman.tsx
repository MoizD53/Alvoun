'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, AlertTriangle } from 'lucide-react';
import { deleteSalesman } from '@/lib/actions/admin/salesman-management';
import { Button } from '@/components/ui/button';
import { AlertBanner } from '@/components/ui/alert-banner';

export default function DeleteSalesman({ id, name }: { id: string; name: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState('');
  const router = useRouter();

  const handleDelete = async () => {
    if (confirmName !== name) {
      setError('Name does not match.');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const result = await deleteSalesman(id);
      if (result?.error) throw new Error(result.error);
      
      router.push('/dashboard/admin/salesmen');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete salesman.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-surface-raised shadow-raised rounded-2xl border border-destructive/30 overflow-hidden">
      <div className="px-6 py-4 border-b border-destructive/20 bg-destructive/5 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-destructive flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Danger Zone
        </h2>
      </div>

      <div className="p-6 space-y-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Deleting this salesman permanently removes their user account, credentials, and territory assignments.
        </p>

        {error && (
          <AlertBanner
            variant="danger"
            onClose={() => setError(null)}
          >
            {error}
          </AlertBanner>
        )}

        {!isOpen ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(true)}
            className="w-full text-destructive border-destructive/40 hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Delete Salesman
          </Button>
        ) : (
          <div className="space-y-3 bg-surface-inset shadow-inset p-4 rounded-xl border border-border/40">
            <p className="text-xs font-medium text-foreground">
              Type <strong className="text-destructive select-all font-bold">{name}</strong> to confirm deletion:
            </p>
            <input
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder="Confirm full name"
              className="w-full rounded-xl bg-surface-raised shadow-raised-sm border border-border/40 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-destructive/40 transition-all"
            />
            
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting || confirmName !== name}
                isLoading={isDeleting}
                className="flex-1 shadow-raised hover:shadow-raised-sm press-active"
              >
                Confirm Delete
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsOpen(false);
                  setConfirmName('');
                  setError(null);
                }}
                disabled={isDeleting}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
