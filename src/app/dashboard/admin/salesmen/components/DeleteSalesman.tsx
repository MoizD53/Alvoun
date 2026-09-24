'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { deleteSalesman } from '@/lib/actions/admin/salesman-management';

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
      if (result.error) throw new Error(result.error);
      
      router.push('/dashboard/admin/salesmen');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete salesman.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-red-200 dark:border-red-900/30 overflow-hidden mt-6">
      <div className="px-6 py-4 border-b border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          Danger Zone
        </h2>
      </div>

      <div className="p-6">
        <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
          Deleting this salesman will permanently wipe out their profile, login access, territory assignments, and active sessions. Historical sales and visit records will be anonymized or cascade deleted depending on the schema structure.
        </p>

        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg text-sm font-medium transition-colors flex items-center"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Salesman
          </button>
        ) : (
          <div className="space-y-4 bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-100 dark:border-red-900/30">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              Type <strong className="font-bold select-all">{name}</strong> to confirm.
            </p>
            <input
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder="Confirm salesman name"
              className="w-full px-3 py-2 border border-red-300 dark:border-red-800 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-slate-900 dark:text-white text-sm"
            />
            
            {error && <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>}
            
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={isDeleting || confirmName !== name}
                className="flex-1 flex justify-center items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isDeleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</> : 'Confirm Delete'}
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setConfirmName('');
                  setError(null);
                }}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
