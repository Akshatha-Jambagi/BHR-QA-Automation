Feature: Employee management
  As a BrightHR account administrator
  I want to add employees with their contact and job details
  So that they appear in the employee directory

  # Uses two rows from data/employees.xlsx and verifies both saved names.
  Scenario: Add two employees and verify both in the directory
    Given I am logged in to BrightHR
    When I add all employees from the spreadsheet
    Then both employees should be visible in the employee directory
