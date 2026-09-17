'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { processCustomerImport } from '@/lib/actions/import';
import { useRouter } from 'next/navigation';

export default function CustomerImporter() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [data, setData] = useState<any[]>([]);
  
  const [mappings, setMappings] = useState<Record<string, string>>({
    customerName: '',
    contact: '',
    address: '',
    state: '',
    city: '',
    route: '',
    salesman: '',
    openingBalance: '',
    openingBalanceType: '',
    status: ''
  });

  const [step, setStep] = useState<1|2|3>(1);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      
      if (json.length > 0) {
        const detectedHeaders = json[0].map(h => String(h).trim());
        setHeaders(detectedHeaders);
        
        // Auto-map if exact matches
        const newMappings = { ...mappings };
        detectedHeaders.forEach(h => {
          const lower = h.toLowerCase().replace(/\s+/g, '');
          Object.keys(mappings).forEach(key => {
            if (key.toLowerCase() === lower || (key === 'customerName' && lower === 'name')) {
              newMappings[key] = h;
            }
          });
        });
        setMappings(newMappings);

        // Map data to objects based on headers
        const rowData = XLSX.utils.sheet_to_json(ws);
        setData(rowData);
        setStep(2);
      }
    };
    reader.readAsBinaryString(file);
  };

  const requiredFields = ['customerName', 'contact', 'address', 'state', 'city', 'route', 'salesman'];
  
  const proceedToPreview = () => {
    // Validate mappings
    const missing = requiredFields.filter(f => !mappings[f]);
    if (missing.length > 0) {
      alert(`Please map the required fields: ${missing.join(', ')}`);
      return;
    }
    setStep(3);
  };

  const handleImport = async () => {
    setImporting(true);
    // Transform data according to mappings
    const mappedData = data.map(row => {
      const mappedRow: any = {};
      Object.entries(mappings).forEach(([key, headerKey]) => {
        if (headerKey && row[headerKey] !== undefined) {
          mappedRow[key] = String(row[headerKey]);
        }
      });
      return mappedRow;
    });

    try {
      const res = await processCustomerImport(mappedData);
      setResults(res);
    } catch (err) {
      console.error(err);
      alert('Import failed');
    } finally {
      setImporting(false);
    }
  };

  if (results) {
    return (
      <div className="bg-white dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-bold mb-4">Import Results</h2>
        <div className="grid grid-cols-2 gap-4 mb-6 text-center">
          <div className="bg-green-50 dark:bg-green-900/20 text-green-700 p-4 rounded-lg">
            <div className="text-2xl font-bold">{results.success}</div>
            <div className="text-sm">Successfully Imported</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 p-4 rounded-lg">
            <div className="text-2xl font-bold">{results.failed}</div>
            <div className="text-sm">Failed</div>
          </div>
        </div>
        
        {results.errors.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Error Log:</h3>
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-4 max-h-64 overflow-y-auto text-sm font-mono text-red-600 space-y-1">
              {results.errors.map((e: string, i: number) => <div key={i}>{e}</div>)}
            </div>
          </div>
        )}

        <button onClick={() => router.push('/dashboard/admin/customers')} className="mt-6 bg-alvoun-blue text-white px-4 py-2 rounded-md hover:bg-alvoun-dark transition-colors">
          Return to Customers
        </button>
      </div>
    );
  }

  return (
    <div>
      {step === 1 && (
        <div className="bg-white dark:bg-slate-950 p-8 rounded-xl border border-slate-200 dark:border-slate-800 text-center border-dashed">
          <UploadIcon className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">Upload Excel/CSV File</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">File must contain customer details along with location routing information.</p>
          <label className="bg-alvoun-blue text-white px-4 py-2 rounded-md cursor-pointer hover:bg-alvoun-dark transition-colors">
            Select File
            <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold mb-4">Map Columns</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">Match your file's columns to the required system fields.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
            {Object.keys(mappings).map(key => (
              <div key={key} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {key} {requiredFields.includes(key) && <span className="text-red-500">*</span>}
                </span>
                <select 
                  value={mappings[key]}
                  onChange={e => setMappings({...mappings, [key]: e.target.value})}
                  className="rounded-md border border-slate-300 dark:border-slate-700 text-sm p-1.5 bg-white dark:bg-slate-950 w-48"
                >
                  <option value="">-- Ignore --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div className="mt-8 flex gap-4">
            <button onClick={() => setStep(1)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:bg-slate-700">Back</button>
            <button onClick={proceedToPreview} className="px-4 py-2 bg-alvoun-blue text-white rounded-md hover:bg-alvoun-dark">Preview Data</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold mb-4">Preview & Confirm</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">Showing first 5 rows of {data.length} total rows.</p>
          
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 mb-6">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                <tr>
                  {Object.keys(mappings).filter(k => mappings[k]).map(k => (
                    <th key={k} className="px-4 py-2 border-b">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.slice(0, 5).map((row, idx) => (
                  <tr key={idx}>
                    {Object.keys(mappings).filter(k => mappings[k]).map(k => (
                      <td key={k} className="px-4 py-2">{row[mappings[k]]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-4">
            <button onClick={() => setStep(2)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:bg-slate-700" disabled={importing}>Back</button>
            <button onClick={handleImport} disabled={importing} className="px-4 py-2 bg-alvoun-blue text-white rounded-md hover:bg-alvoun-dark disabled:opacity-50">
              {importing ? 'Importing...' : `Import ${data.length} Customers`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function UploadIcon(props: any) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}
