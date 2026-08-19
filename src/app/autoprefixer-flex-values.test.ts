import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = (fileName: string) => readFileSync(resolve(process.cwd(), "src/app", fileName), "utf8");

describe("compatibilidade Flex no CSS", () => {
  it("mantém valores flex-start e flex-end nos sete contêineres que entram no build", () => {
    expect(css("cms.css")).toContain(".cms-header{display:flex;align-items:flex-end;justify-content");
    expect(css("erp.css")).toContain(".crm-filterbar { display:flex; align-items:flex-end; gap");
    expect(css("events-admin.css")).toContain(".events-admin-header,.reports-page>header{display:flex;align-items:flex-end;");
    expect(css("globals.css")).toContain(".store-heading { display:flex; justify-content:space-between; align-items:flex-end;");
    expect(css("ods.css")).toContain(".ods-board>header{display:flex;align-items:flex-end;");
    expect(css("ods.css")).toContain(".ods-order header{display:flex;align-items:flex-start;");
    expect(css("ods.css")).toContain(".ods-manual-order__heading{display:flex;align-items:flex-start;");
  });
});
