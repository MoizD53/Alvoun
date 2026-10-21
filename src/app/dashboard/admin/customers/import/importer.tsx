'use client';

import { useState } from 'react';
import { processCustomerImport } from '@/lib/actions/import';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  UploadCloud, FileSpreadsheet, ArrowRight, ArrowLeft, 
  CheckCircle2, XCircle, AlertCircle, FileCheck2, Loader2 
} from 'lucide-react';

export default function CustomerImporter() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [data, setData] = useState<any[]>([]);
  
  const [mappings, setMappings] = useState<Record<string, string>>({
    customerName: '',
    code: '',
    contact: '',
    address: '',
    state: '',
    city: '',
    route: '',
    area: '',
    salesman: '',
    openingBalance: '',
    openingBalanceType: '',
    status: ''
  });

  const [step, setStep] = useState<1|2|3>(1);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const XLSX = await import('xlsx');
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);

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
            if (key.toLowerCase() === lower || (key === 'customerName' && lower === 'name') || (key === 'code' && (lower === 'code' || lower === 'customercode' || lower === 'custcode'))) {
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
    reader.readAsBinaryString(uploadedFile);
  };

  const requiredFields = ['customerName', 'route', 'area'];
  
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
      <div className="bg-surface-raised shadow-raised p-6 sm:p-8 rounded-2xl border border-border/40 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Import Results</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Batch execution completed</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl text-center">
            <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{results.success}</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mt-1">
              Successfully Imported
            </div>
          </div>
          <div className="bg-destructive/10 border border-destructive/20 p-5 rounded-2xl text-center">
            <div className="text-3xl font-extrabold text-destructive">{results.failed}</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-destructive mt-1">
              Failed Rows
            </div>
          </div>
        </div>
        
        {results.errors?.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Error Details</h3>
            <div className="bg-surface-inset shadow-inset border border-border/40 rounded-xl p-4 max-h-60 overflow-y-auto text-xs font-mono text-destructive space-y-1.5">
              {results.errors.map((e: string, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{e}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2">
          <Button 
            onClick={() => router.push('/dashboard/admin/customers')} 
            variant="primary"
            className="shadow-raised hover:shadow-raised-sm press-active"
          >
            Return to Customers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="bg-surface-raised shadow-raised p-4 rounded-2xl border border-border/40 flex items-center justify-between max-w-xl mx-auto">
        <div className={`flex items-center gap-2 text-xs font-semibold ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-primary text-primary-foreground font-bold' : 'bg-surface-inset text-muted-foreground'}`}>1</span>
          Upload File
        </div>
        <div className="h-0.5 w-12 bg-border/40" />
        <div className={`flex items-center gap-2 text-xs font-semibold ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-primary text-primary-foreground font-bold' : 'bg-surface-inset text-muted-foreground'}`}>2</span>
          Map Columns
        </div>
        <div className="h-0.5 w-12 bg-border/40" />
        <div className={`flex items-center gap-2 text-xs font-semibold ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-primary text-primary-foreground font-bold' : 'bg-surface-inset text-muted-foreground'}`}>3</span>
          Preview & Import
        </div>
      </div>

      {step === 1 && (
        <div className="bg-surface-raised shadow-raised p-8 sm:p-12 rounded-2xl border border-border/40 text-center max-w-2xl mx-auto">
          <div className="bg-surface-inset shadow-inset border-2 border-dashed border-border hover:border-primary/60 rounded-2xl p-10 transition-colors">
            <div className="w-16 h-16 rounded-2xl bg-surface-raised shadow-raised border border-border/40 flex items-center justify-center mx-auto mb-4 text-primary">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">Upload Spreadsheet</h3>
            <p className="text-muted-foreground text-xs sm:text-sm mb-6 max-w-sm mx-auto">
              Select an .xlsx, .xls, or .csv file with customer records and routing definitions.
            </p>
            <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-raised hover:shadow-raised-sm press-active cursor-pointer transition-all">
              <FileSpreadsheet className="w-4 h-4" />
              Browse File
              <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-surface-raised shadow-raised p-6 sm:p-8 rounded-2xl border border-border/40 max-w-3xl mx-auto space-y-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">Map Columns</h2>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
              Pair your spreadsheet headers with Alvoun system customer fields.
            </p>
          </div>
          
          <div className="bg-surface-inset shadow-inset rounded-2xl p-5 border border-border/40 divide-y divide-border/40">
            {Object.keys(mappings).map(key => (
              <div key={key} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                  {key} {requiredFields.includes(key) && <span className="text-destructive">*</span>}
                </span>
                <select 
                  value={mappings[key]}
                  onChange={e => setMappings({...mappings, [key]: e.target.value})}
                  className="rounded-xl bg-surface-raised shadow-raised border border-border/40 text-xs sm:text-sm px-3 py-2 text-foreground w-full sm:w-60 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="">-- Ignore Field --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </Button>
            <Button variant="primary" onClick={proceedToPreview} className="shadow-raised hover:shadow-raised-sm press-active">
              Preview Data <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-surface-raised shadow-raised p-6 sm:p-8 rounded-2xl border border-border/40 max-w-4xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-foreground">Preview & Confirm</h2>
              <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                Previewing top 5 sample rows of {data.length} total rows parsed.
              </p>
            </div>
            <Badge variant="teal" size="md">
              {data.length} Total Customers
            </Badge>
          </div>
          
          <div className="overflow-x-auto rounded-xl border border-border/40">
            <table className="w-full text-xs text-left whitespace-nowrap">
              <thead className="bg-surface-inset shadow-inset text-muted-foreground uppercase font-semibold border-b border-border/40">
                <tr>
                  {Object.keys(mappings).filter(k => mappings[k]).map(k => (
                    <th key={k} className="px-4 py-3">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 bg-surface-raised">
                {data.slice(0, 5).map((row, idx) => (
                  <tr key={idx} className="hover:bg-surface-inset/30">
                    {Object.keys(mappings).filter(k => mappings[k]).map(k => (
                      <td key={k} className="px-4 py-2.5 text-foreground">{row[mappings[k]] || '-'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(2)} disabled={importing}>
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </Button>
            <Button 
              variant="primary" 
              onClick={handleImport} 
              isLoading={importing}
              className="shadow-raised hover:shadow-raised-sm press-active"
            >
              <FileCheck2 className="w-4 h-4 mr-1.5" />
              {importing ? 'Importing Batch...' : `Import ${data.length} Customers`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
