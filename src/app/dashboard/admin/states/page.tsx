import { getStates, createState } from '@/lib/actions/state';

export default async function StatesPage() {
  const states = await getStates();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">States</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">State Name</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {states.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-slate-500">No states found.</td>
                  </tr>
                ) : (
                  states.map((state) => (
                    <tr key={state.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{state.name}</td>
                      <td className="px-4 py-3 text-right text-alvoun-blue">
                        <button className="text-sm font-medium hover:underline">Edit</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 h-fit">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Add State</h2>
          <form action={async (data) => { 'use server'; await createState(data); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">State Name</label>
              <input 
                type="text" 
                name="name" 
                required 
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-alvoun-blue focus:outline-none focus:ring-1 focus:ring-alvoun-blue"
                placeholder="e.g. Maharashtra"
              />
            </div>
            <button type="submit" className="w-full bg-alvoun-blue text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-alvoun-dark transition-colors">
              Add State
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
