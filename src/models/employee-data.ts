/** Employee fields matching the spreadsheet columns and BrightHR form. */
export interface EmployeeData {
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber: string;
  startDate: string;
  jobTitle: string;
}

/** Contract for interchangeable employee data sources. */
export interface EmployeeDataSource {
  /** Reads employee rows from the configured source. */
  loadEmployees(): Promise<EmployeeData[]>;
}
