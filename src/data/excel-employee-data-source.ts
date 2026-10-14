import ExcelJS from 'exceljs';
import { EmployeeData, EmployeeDataSource } from '../models/employee-data';

function cellText(value: ExcelJS.CellValue | undefined, cellAddress: string): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if ('text' in value && typeof value.text === 'string') return value.text.trim();
  if ('richText' in value && Array.isArray(value.richText)) {
    return value.richText.map(fragment => fragment.text).join('').trim();
  }
  if ('result' in value && value.result !== undefined) return cellText(value.result, cellAddress);
  throw new Error(`Workbook cell ${cellAddress} contains an unsupported value; use plain text or a formula with a result.`);
}

/** Reads employee records from the first worksheet of an Excel workbook. */
export class ExcelEmployeeDataSource implements EmployeeDataSource {
  /** Workbook path is private so callers use the source contract, not its internals. */
  private readonly filePath: string;

  /** Creates a source for the requested workbook. */
  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /** Loads rows using the documented six-column header order. */
  async loadEmployees(): Promise<EmployeeData[]> {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.readFile(this.filePath);
    } catch (error) {
      throw new Error(`Unable to read employee workbook '${this.filePath}': ${String(error)}`);
    }

    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 2) throw new Error(`Workbook '${this.filePath}' has no employee data rows.`);
    const employees: EmployeeData[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const fields = Array.from({ length: 6 }, (_, index) => {
        const column = index + 1;
        return cellText(row.getCell(column).value, row.getCell(column).address);
      });
      if (fields.every((value) => value.length === 0)) return;
      if (fields.some((value) => value.length === 0)) {
        throw new Error(`Workbook row ${rowNumber} is incomplete; all six employee columns are required.`);
      }
      employees.push({
        firstName: fields[0], lastName: fields[1], emailAddress: fields[2],
        phoneNumber: fields[3], startDate: fields[4], jobTitle: fields[5]
      });
    });
    if (employees.length < 2) throw new Error('The employee workbook must contain at least two data rows.');
    return employees;
  }
}
