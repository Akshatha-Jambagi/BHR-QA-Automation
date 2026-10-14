import { Page } from '@playwright/test';

/** Base abstraction that encapsulates the Playwright page shared by page objects. */
export abstract class BasePage {
  /** Encapsulated page handle used by derived page objects. */
  protected readonly page: Page;

  /** Initializes a page object with its browser page. */
  protected constructor(page: Page) {
    this.page = page;
  }
}
