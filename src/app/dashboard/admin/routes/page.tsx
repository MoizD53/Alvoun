import { getRoutes, createRoute } from '@/lib/actions/route';
import { getCities } from '@/lib/actions/city';
import { getSalesmen } from '@/lib/actions/salesman';

export default async function RoutesPage() {
  const routes = await getRoutes();
  const cities = await getCities();
  const salesmen = await getSalesmen();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Routes</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Route Name</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3">Assigned Salesman</th>
                  <th className="px-4 py-3">Customers</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {routes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">No routes found.</td>
                  </tr>
                ) : (
                  routes.map((route) => (
                    <tr key={route.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{route.name}</td>
                      <td className="px-4 py-3 text-slate-600">{route.city.name}</td>
                      <td className="px-4 py-3 text-slate-600">{route.city.state.name}</td>
                      <td className="px-4 py-3 text-slate-600">{route.salesman?.name || '-'}</td>
                      <td className="px-4 py-3 font-medium text-alvoun-blue">{route._count.customers} active</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${route.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                          {route.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
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
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Add Route</h2>
          <form action={async (data) => { 'use server'; await createRoute(data); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
              <select 
                name="cityId" 
                required 
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white focus:border-alvoun-blue focus:outline-none focus:ring-1 focus:ring-alvoun-blue"
              >
                <option value="">Select City</option>
                {cities.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.state.name})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Route Name</label>
              <input 
                type="text" 
                name="name" 
                required 
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-alvoun-blue focus:outline-none focus:ring-1 focus:ring-alvoun-blue"
                placeholder="e.g. Kasba"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Assign Salesman</label>
              <select 
                name="salesmanId" 
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white focus:border-alvoun-blue focus:outline-none focus:ring-1 focus:ring-alvoun-blue"
              >
                <option value="">Unassigned</option>
                {salesmen.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.employeeCode})</option>
                ))}
              </select>
            </div>
            <div className="flex items-center">
              <input 
                type="checkbox" 
                name="isActive" 
                id="isActive"
                defaultChecked
                className="h-4 w-4 rounded border-slate-300 text-alvoun-blue focus:ring-alvoun-blue"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-slate-700">Active</label>
            </div>
            <button type="submit" className="w-full bg-alvoun-blue text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-alvoun-dark transition-colors">
              Add Route
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
