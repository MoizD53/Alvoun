import { getCities, createCity } from '@/lib/actions/city';
import { getStates } from '@/lib/actions/state';

export default async function CitiesPage() {
  const cities = await getCities();
  const states = await getStates();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Cities</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">City Name</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cities.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-500">No cities found.</td>
                  </tr>
                ) : (
                  cities.map((city) => (
                    <tr key={city.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{city.name}</td>
                      <td className="px-4 py-3 text-slate-600">{city.state.name}</td>
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
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Add City</h2>
          <form action={async (data) => { 'use server'; await createCity(data); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
              <select 
                name="stateId" 
                required 
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white focus:border-alvoun-blue focus:outline-none focus:ring-1 focus:ring-alvoun-blue"
              >
                <option value="">Select State</option>
                {states.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City Name</label>
              <input 
                type="text" 
                name="name" 
                required 
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-alvoun-blue focus:outline-none focus:ring-1 focus:ring-alvoun-blue"
                placeholder="e.g. Mumbai"
              />
            </div>
            <button type="submit" className="w-full bg-alvoun-blue text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-alvoun-dark transition-colors">
              Add City
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
