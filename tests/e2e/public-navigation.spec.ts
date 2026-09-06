import { diagnosticStep, expect, test } from "./protected-preview.fixture";

test.describe("jornadas públicas sem escrita", () => {
  test("a landing apresenta a navegação principal e alcança a loja", async ({ page }) => {
    await diagnosticStep("D1", "R1", () => page.goto("/"));

    await diagnosticStep("D1", "A1", () => expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeVisible());
    await diagnosticStep("D1", "A2", () => expect(page.getByRole("heading", { name: /Veste\.\s*Vive\.\s*Vence\./i })).toBeVisible());

    await diagnosticStep("D1", "A3", () => page.getByRole("link", { name: /Ir para a loja/i }).click());
    await diagnosticStep("D1", "A4", () => expect(page).toHaveURL(/\/loja$/));
    await diagnosticStep("D1", "A5", () => expect(page.getByRole("heading", { name: /Vista a torcida/i })).toBeVisible());
  });

  test("a loja permite explorar detalhes e carrinho sem iniciar checkout", async ({ page }) => {
    await page.goto("/loja");

    const product = page.getByRole("button", { name: /Ver produto:/i }).first();
    await expect(product).toBeVisible();
    await product.click();

    const details = page.getByRole("dialog");
    await expect(details).toBeVisible();
    await expect(details.getByRole("button", { name: /Adicionar ao carrinho|Indisponível/i })).toBeVisible();
    await details.getByRole("button", { name: "Fechar detalhes" }).last().click();

    await page.locator(".store-cart-trigger").click();
    await expect(page.getByRole("dialog", { name: "Carrinho de compras" })).toBeVisible();
    await expect(page.getByText("Seu carrinho está vazio.")).toBeVisible();
  });

  test("a agenda pública apresenta conteúdo ou estado vazio e oferece retorno", async ({ page }) => {
    await page.goto("/eventos");

    await expect(page.getByRole("heading", { name: /É aqui que a história acontece/i })).toBeVisible();
    await expect(page.locator(".event-list-card, .events-empty").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Voltar ao início/i })).toHaveAttribute("href", "/");
  });

  test("o login expõe controles públicos sem preencher ou enviar credenciais", async ({ page }) => {
    await diagnosticStep("D4", "R1", () => page.goto("/login"));

    await diagnosticStep("D4", "A1", () => expect(page.getByRole("textbox", { name: "E-mail" })).toBeVisible());
    await diagnosticStep("D4", "A2", () => expect(page.getByLabel("Senha")).toBeVisible());
    await diagnosticStep("D4", "A3", () => expect(page.getByRole("button", { name: "Entrar na FSA" })).toBeVisible());
    await diagnosticStep("D4", "A4", () => expect(page.getByText("400020")).toHaveCount(0));
  });

  test("uma rota ERP anônima é redirecionada ao login sem expor o painel", async ({ page }) => {
    await page.goto("/erp");

    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /Chegue junto/i })).toBeVisible();
    await expect(page.getByText(/painel administrativo/i)).toHaveCount(0);
  });
});
