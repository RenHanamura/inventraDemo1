import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, X, ArrowRight, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { parseCSV, INVENTRA_FIELDS, ColumnMapping, validateImportData, ProductImportData } from '@/lib/csvParser';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useImportHistory } from '@/hooks/useImportHistory';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'upload' | 'mapping' | 'validation' | 'importing' | 'complete';

export function BulkImportModal({ isOpen, onClose }: BulkImportModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<{ headers: string[]; rawData: Record<string, string>[] } | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [validData, setValidData] = useState<ProductImportData[]>([]);
  const [validationErrors, setValidationErrors] = useState<{ row: number; field: string; message: string }[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: products = [] } = useProducts();
  const { data: categories = [] } = useCategories();
  const { createImportRecord, updateImportRecord } = useImportHistory();

  const existingSkus = new Set(products.map((p) => p.sku.toLowerCase()));

  const resetState = () => {
    setStep('upload');
    setFile(null);
    setCsvData(null);
    setMappings([]);
    setValidData([]);
    setValidationErrors([]);
    setImportProgress(0);
    setImportResult(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const parsed = parseCSV(content);
      
      if (parsed.headers.length === 0) {
        toast.error('Could not parse CSV file. Please check the format.');
        return;
      }

      setFile(selectedFile);
      setCsvData(parsed);
      
      // Auto-map columns based on name similarity
      const autoMappings: ColumnMapping[] = parsed.headers.map((header) => {
        const headerLower = header.toLowerCase().replace(/[_\s-]/g, '');
        const match = INVENTRA_FIELDS.find((f) => {
          const fieldLower = f.label.toLowerCase().replace(/[_\s-]/g, '');
          const idLower = f.id.toLowerCase().replace(/[_\s-]/g, '');
          return headerLower === fieldLower || headerLower === idLower || headerLower.includes(idLower);
        });
        return { csvColumn: header, inventraField: match?.id || '' };
      });
      
      setMappings(autoMappings);
      setStep('mapping');
    };
    reader.readAsText(selectedFile);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleValidate = () => {
    if (!csvData) return;

    const { valid, errors } = validateImportData(csvData.rawData, mappings, existingSkus);
    setValidData(valid);
    setValidationErrors(errors);
    setStep('validation');
  };

  const handleImport = async () => {
    if (validData.length === 0) return;

    setStep('importing');
    
    // Create import record
    const importRecord = await createImportRecord.mutateAsync({
      fileName: file?.name || 'import.csv',
      totalRows: csvData?.rawData.length || 0,
    });

    let success = 0;
    let failed = 0;
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < validData.length; i++) {
      const product = validData[i];
      
      try {
        // Find category by name if provided
        let categoryId: string | null = null;
        if (product.category_name) {
          const cat = categories.find(
            (c) => c.name.toLowerCase() === product.category_name?.toLowerCase()
          );
          categoryId = cat?.id || null;
        }

        const { error } = await supabase.from('products').insert({
          name: product.name,
          sku: product.sku,
          description: product.description || null,
          quantity: product.quantity || 0,
          unit_price: product.unit_price || 0,
          cost_price: product.cost_price || 0,
          reorder_point: product.reorder_point || 10,
          serial_number: product.serial_number || null,
          micro_location: product.micro_location || null,
          status_category: product.status_category || 'available',
          custodian: product.custodian || null,
          category_id: categoryId,
        });

        if (error) {
          throw error;
        }
        success++;
      } catch (err: unknown) {
        failed++;
        errors.push({ row: i + 2, message: err instanceof Error ? err.message : 'Unknown error' });
      }

      setImportProgress(Math.round(((i + 1) / validData.length) * 100));
    }

    // Update import record
    await updateImportRecord.mutateAsync({
      id: importRecord.id,
      successfulRows: success,
      failedRows: failed,
      errors,
      status: failed === 0 ? 'completed' : 'failed',
    });

    setImportResult({ success, failed });
    setStep('complete');
  };

  const updateMapping = (csvColumn: string, inventraField: string) => {
    setMappings((prev) =>
      prev.map((m) => (m.csvColumn === csvColumn ? { ...m, inventraField } : m))
    );
  };

  const requiredFieldsMapped = INVENTRA_FIELDS
    .filter((f) => f.required)
    .every((f) => mappings.some((m) => m.inventraField === f.id));

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Import Products
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload a CSV file to import multiple products at once.'}
            {step === 'mapping' && 'Map your CSV columns to Inventra product fields.'}
            {step === 'validation' && 'Review validation results before importing.'}
            {step === 'importing' && 'Importing products...'}
            {step === 'complete' && 'Import complete!'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Step: Upload */}
          {step === 'upload' && (
            <div
              className={cn(
                'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
                'hover:border-primary/50 hover:bg-muted/50'
              )}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Drop your CSV file here</h3>
              <p className="text-muted-foreground mb-4">or click to browse</p>
              <Button onClick={() => fileInputRef.current?.click()}>
                Select CSV File
              </Button>
            </div>
          )}

          {/* Step: Mapping */}
          {step === 'mapping' && csvData && (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Found <strong>{csvData.headers.length}</strong> columns and{' '}
                    <strong>{csvData.rawData.length}</strong> rows in your CSV.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  {mappings.map((mapping) => (
                    <div key={mapping.csvColumn} className="flex items-center gap-3">
                      <div className="flex-1 p-2 bg-muted rounded-lg text-sm font-mono truncate">
                        {mapping.csvColumn}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Select
                        value={mapping.inventraField}
                        onValueChange={(value) => updateMapping(mapping.csvColumn, value)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select field..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">-- Skip this column --</SelectItem>
                          {INVENTRA_FIELDS.map((field) => (
                            <SelectItem key={field.id} value={field.id}>
                              {field.label}
                              {field.required && <span className="text-destructive ml-1">*</span>}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                {!requiredFieldsMapped && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Please map all required fields: Product Name and SKU
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Step: Validation */}
          {step === 'validation' && (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-success/10 border border-success/20 rounded-xl">
                    <div className="flex items-center gap-2 text-success mb-1">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-semibold">Valid Rows</span>
                    </div>
                    <p className="text-2xl font-bold">{validData.length}</p>
                  </div>
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
                    <div className="flex items-center gap-2 text-destructive mb-1">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-semibold">Errors</span>
                    </div>
                    <p className="text-2xl font-bold">{validationErrors.length}</p>
                  </div>
                </div>

                {validationErrors.length > 0 && (
                  <div className="space-y-2">
                    <Label>Validation Errors:</Label>
                    <div className="space-y-1 max-h-[200px] overflow-y-auto">
                      {validationErrors.slice(0, 50).map((err, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-2 bg-destructive/5 rounded text-sm"
                        >
                          <Badge variant="destructive" className="shrink-0">
                            Row {err.row}
                          </Badge>
                          <span className="text-destructive">{err.message}</span>
                        </div>
                      ))}
                      {validationErrors.length > 50 && (
                        <p className="text-muted-foreground text-sm">
                          ... and {validationErrors.length - 50} more errors
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {validData.length > 0 && (
                  <div className="space-y-2">
                    <Label>Preview (first 5 products):</Label>
                    <div className="space-y-1">
                      {validData.slice(0, 5).map((product, idx) => (
                        <div key={idx} className="p-2 bg-muted rounded text-sm">
                          <span className="font-medium">{product.name}</span>
                          <span className="text-muted-foreground ml-2">({product.sku})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Step: Importing */}
          {step === 'importing' && (
            <div className="py-8 space-y-6">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-lg font-medium">Importing products...</p>
                <p className="text-muted-foreground">
                  {Math.round((importProgress / 100) * validData.length)} of {validData.length} products
                </p>
              </div>
              <Progress value={importProgress} className="h-2" />
            </div>
          )}

          {/* Step: Complete */}
          {step === 'complete' && importResult && (
            <div className="py-8 text-center space-y-6">
              <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Import Complete!</h3>
                <p className="text-muted-foreground">
                  Successfully imported <strong>{importResult.success}</strong> products.
                  {importResult.failed > 0 && (
                    <span className="text-destructive">
                      {' '}
                      {importResult.failed} products failed to import.
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {step !== 'importing' && (
            <Button variant="outline" onClick={handleClose}>
              {step === 'complete' ? 'Close' : 'Cancel'}
            </Button>
          )}
          
          {step === 'mapping' && (
            <Button onClick={handleValidate} disabled={!requiredFieldsMapped}>
              Validate Data
            </Button>
          )}
          
          {step === 'validation' && validData.length > 0 && (
            <Button onClick={handleImport}>
              Import {validData.length} Products
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
