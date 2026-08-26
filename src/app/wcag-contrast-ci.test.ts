import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(resolve(process.cwd(), ".github/workflows/ci.yml"), "utf8");
const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as {
  scripts: Record<string, string>;
};

describe("integração contínua da auditoria WCAG", () => {
  it("executa o contrato de contraste explicitamente em pull requests e atualizações da main", () => {
    expect(workflow).toContain("pull_request:");
    expect(workflow).toContain("push:");
    expect(workflow).toContain("- main");
    expect(workflow).toContain("name: WCAG contrast");
    expect(workflow).toContain("run: pnpm test:wcag-contrast");
  });

  it("mantém o comando de contraste isolado para um diagnóstico claro no CI", () => {
    expect(packageJson.scripts["test:wcag-contrast"]).toBe("vitest run src/app/wcag-contrast.test.ts");
    expect(packageJson.scripts["test:wcag-a11y"]).toBe("vitest run src/app/wcag-a11y.test.ts");
  });

  it("notifica o Slack somente após falhas WCAG e preserva a falha do workflow", () => {
    expect(workflow).toContain("name: WCAG keyboard and screen reader semantics");
    expect(workflow).toContain("run: pnpm test:wcag-a11y");
    expect(workflow).toContain("name: Notify Slack about WCAG failure");
    expect(workflow).toContain("steps.wcag_contrast.outcome == 'failure'");
    expect(workflow).toContain("steps.wcag_a11y.outcome == 'failure'");
    expect(workflow).toContain("secrets.CI_SLACK_WEBHOOK_URL");
    expect(workflow).toContain("curl --fail-with-body");
    expect(workflow).toContain("name: Fail CI after WCAG notification");
  });

  it("permite validar a entrega Slack manualmente sem introduzir uma falha WCAG artificial", () => {
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("test_wcag_slack_alert:");
    expect(workflow).toContain("inputs.test_wcag_slack_alert == true");
    expect(workflow).toContain("CI_WCAG_ALERT_MODE");
    expect(workflow).toContain("teste controlado");
  });
});
