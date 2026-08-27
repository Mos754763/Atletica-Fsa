import { expect, test } from "@playwright/test";

test.describe("jornadas públicas sem escrita", () => {
  test("a landing apresenta a navegação principal e alcança a loja", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Veste\.\s*Vive\.\s*Vence\./i })).toBeVisible();

    await page.getByRole("link", { name: /Ir para a loja/i }).click();
    await expect(page).toHaveURL(/\/loja$/);
    await expect(page.getByRole("heading", { name: /Vista a torcida/i })).toBeVisible();
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
    await page.goto("/login");

    await expect(page.getByRole("textbox", { name: "E-mail" })).toBeVisible();
    await expect(page.getByLabel("Senha")).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar na FSA" })).toBeVisible();
    await expect(page.getByText("400020")).toHaveCount(0);
  });

  test("uma rota ERP anônima é redirecionada ao login sem expor o painel", async ({ page }) => {
    await page.goto("/erp");

    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: /Chegue junto/i })).toBeVisible();
    await expect(page.getByText(/painel administrativo/i)).toHaveCount(0);
  });
});
