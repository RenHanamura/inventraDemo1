export interface CSVParseResult {
  headers: string[];
  rows: string[][];
  rawData: Record<string, string>[];
}

export function parseCSV(content: string): CSVParseResult {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  
  if (lines.length === 0) {
    return { headers: [], rows: [], rawData: [] };
  }

  // Parse headers
  const headers = parseCSVLine(lines[0]);
  
  // Parse data rows
  const rows: string[][] = [];
  const rawData: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length > 0) {
      rows.push(values);
      
      const rowData: Record<string, string> = {};
      headers.forEach((header, idx) => {
        rowData[header] = values[idx] || '';
      });
      rawData.push(rowData);
    }
  }

  return { headers, rows, rawData };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

export interface ColumnMapping {
  csvColumn: string;
  inventraField: string;
}

export const INVENTRA_FIELDS = [
  { id: 'name', label: 'Product Name', required: true },
  { id: 'sku', label: 'SKU', required: true },
  { id: 'description', label: 'Description', required: false },
  { id: 'quantity', label: 'Quantity', required: false },
  { id: 'unit_price', label: 'Unit Price', required: false },
  { id: 'cost_price', label: 'Cost Price', required: false },
  { id: 'reorder_point', label: 'Reorder Point', required: false },
  { id: 'serial_number', label: 'Serial Number', required: false },
  { id: 'micro_location', label: 'Micro Location', required: false },
  { id: 'status_category', label: 'Status Category', required: false },
  { id: 'custodian', label: 'Custodian', required: false },
  { id: 'category_name', label: 'Category (by name)', required: false },
] as const;

export type InventraFieldId = (typeof INVENTRA_FIELDS)[number]['id'];

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ProductImportData {
  name: string;
  sku: string;
  description?: string;
  quantity?: number;
  unit_price?: number;
  cost_price?: number;
  reorder_point?: number;
  serial_number?: string;
  micro_location?: string;
  status_category?: string;
  custodian?: string;
  category_name?: string;
}

export function validateImportData(
  data: Record<string, string>[],
  mappings: ColumnMapping[],
  existingSkus: Set<string>
): { valid: ProductImportData[]; errors: ValidationError[] } {
  const valid: ProductImportData[] = [];
  const errors: ValidationError[] = [];
  const seenSkus = new Set<string>();

  const mappingLookup = new Map<string, string>();
  mappings.forEach((m) => {
    if (m.inventraField) {
      mappingLookup.set(m.inventraField, m.csvColumn);
    }
  });

  data.forEach((row, idx) => {
    const rowNumber = idx + 2; // Account for header row and 0-index
    const rowErrors: ValidationError[] = [];

    // Get mapped values
    const getValue = (field: string): string => {
      const csvCol = mappingLookup.get(field);
      return csvCol ? row[csvCol]?.trim() || '' : '';
    };

    const name = getValue('name');
    const sku = getValue('sku');

    // Validate required fields
    if (!name) {
      rowErrors.push({ row: rowNumber, field: 'name', message: 'Product name is required' });
    }

    if (!sku) {
      rowErrors.push({ row: rowNumber, field: 'sku', message: 'SKU is required' });
    } else {
      // Check for duplicates
      if (existingSkus.has(sku.toLowerCase())) {
        rowErrors.push({ row: rowNumber, field: 'sku', message: `SKU "${sku}" already exists` });
      }
      if (seenSkus.has(sku.toLowerCase())) {
        rowErrors.push({ row: rowNumber, field: 'sku', message: `Duplicate SKU "${sku}" in import file` });
      }
      seenSkus.add(sku.toLowerCase());
    }

    // Validate numeric fields
    const quantity = getValue('quantity');
    const unitPrice = getValue('unit_price');
    const costPrice = getValue('cost_price');
    const reorderPoint = getValue('reorder_point');

    if (quantity && isNaN(Number(quantity))) {
      rowErrors.push({ row: rowNumber, field: 'quantity', message: 'Quantity must be a number' });
    }
    if (unitPrice && isNaN(Number(unitPrice))) {
      rowErrors.push({ row: rowNumber, field: 'unit_price', message: 'Unit price must be a number' });
    }
    if (costPrice && isNaN(Number(costPrice))) {
      rowErrors.push({ row: rowNumber, field: 'cost_price', message: 'Cost price must be a number' });
    }
    if (reorderPoint && isNaN(Number(reorderPoint))) {
      rowErrors.push({ row: rowNumber, field: 'reorder_point', message: 'Reorder point must be a number' });
    }

    if (rowErrors.length === 0) {
      valid.push({
        name,
        sku,
        description: getValue('description') || undefined,
        quantity: quantity ? Number(quantity) : undefined,
        unit_price: unitPrice ? Number(unitPrice) : undefined,
        cost_price: costPrice ? Number(costPrice) : undefined,
        reorder_point: reorderPoint ? Number(reorderPoint) : undefined,
        serial_number: getValue('serial_number') || undefined,
        micro_location: getValue('micro_location') || undefined,
        status_category: getValue('status_category') || 'available',
        custodian: getValue('custodian') || undefined,
        category_name: getValue('category_name') || undefined,
      });
    } else {
      errors.push(...rowErrors);
    }
  });

  return { valid, errors };
}
