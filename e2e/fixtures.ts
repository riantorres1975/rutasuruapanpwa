import { expect, test as base } from "@playwright/test";
import { isKnownMapboxWorkerError } from "./browser-errors";

type BrowserErrorFixtures = {
  browserErrors: void;
};

export const test = base.extend<BrowserErrorFixtures>({
  browserErrors: [async ({ page }, use) => {
    const unexpectedErrors: Error[] = [];
    const recordPageError = (error: Error) => {
      if (!isKnownMapboxWorkerError(error)) unexpectedErrors.push(error);
    };

    page.on("pageerror", recordPageError);
    await use();
    page.off("pageerror", recordPageError);

    expect(
      unexpectedErrors.map((error) => error.stack ?? error.message),
      "La página emitió errores inesperados durante la prueba",
    ).toEqual([]);
  }, { auto: true }],
});

export { expect };
