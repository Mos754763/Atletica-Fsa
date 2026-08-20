const PRODUCTION_HOSTS = new Set([
  "atleticafsa.site",
  "www.atleticafsa.site",
  "atletica-fsa.vercel.app",
]);

export function resolveHomologationTarget(baseUrl, environment) {
  if (environment !== "homologation") {
    throw new Error("QA_ENVIRONMENT deve ser exatamente 'homologation'.");
  }

  const url = new URL(baseUrl);
  const hostname = url.hostname.toLowerCase();

  if (PRODUCTION_HOSTS.has(hostname) || hostname.includes("-git-main-")) {
    throw new Error("O roteiro de QA recusa hosts de Production e aliases da branch main.");
  }

  if (!hostname.endsWith(".vercel.app") && hostname !== "localhost" && hostname !== "127.0.0.1") {
    throw new Error("QA_BASE_URL deve ser uma URL de preview/homologação explicitamente informada.");
  }

  return url.origin;
}

export function resolvePreviewHeaders(bypassSecret) {
  const headers = { "User-Agent": "ATLETICA-FSA-Homologation-QA/1.0" };
  const normalizedSecret = bypassSecret?.trim();

  if (normalizedSecret) {
    headers["x-vercel-protection-bypass"] = normalizedSecret;
    headers["x-vercel-set-bypass-cookie"] = "true";
  }

  return headers;
}

function expectStatus(result, allowedStatuses) {
  if (!allowedStatuses.includes(result.status)) {
    throw new Error(`${result.name}: HTTP ${result.status}; esperado ${allowedStatuses.join(" ou ")}.`);
  }
}

async function request(origin, name, path, allowedStatuses, assertion, headers) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(`${origin}${path}`, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers,
    });
    const result = { name, path, status: response.status, location: response.headers.get("location") };
    expectStatus(result, allowedStatuses);
    if (assertion) await assertion(response, result);
    return { ...result, state: "passed" };
  } catch (error) {
    return { name, path, state: "failed", error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

export async function runHomologationSmoke(baseUrl, environment, bypassSecret) {
  const origin = resolveHomologationTarget(baseUrl, environment);
  const headers = resolvePreviewHeaders(bypassSecret);
  const results = [];

  for (const [name, path] of [
    ["landing pública", "/"],
    ["loja pública", "/loja"],
    ["eventos públicos", "/eventos"],
    ["login", "/login"],
    ["redefinição de senha", "/redefinir-senha"],
  ]) {
    results.push(await request(origin, name, path, [200], undefined, headers));
  }

  results.push(await request(origin, "configuração pública", "/api/public-config", [200], async (response) => {
    const config = await response.json();
    if (config.configured !== true || !String(config.url ?? "").includes("gfnbdjdqumewspvfxicl")) {
      throw new Error("A configuração pública não aponta para o projeto Supabase de homologação esperado.");
    }
  }, headers));

  results.push(await request(origin, "proteção da área administrativa", "/admin", [302, 303, 307], async (response) => {
    if (!response.headers.get("location")?.includes("/login")) {
      throw new Error("A rota administrativa não redirecionou para o login.");
    }
  }, headers));

  results.push(await request(origin, "proteção do cron", "/api/cron/integration-health", [401, 403], undefined, headers));

  return { checkedAt: new Date().toISOString(), environment, origin, mode: "read-only", results };
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  const report = await runHomologationSmoke(
    process.env.QA_BASE_URL ?? "",
    process.env.QA_ENVIRONMENT,
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? process.env.QA_VERCEL_PROTECTION_BYPASS_SECRET,
  );
  console.log(JSON.stringify(report, null, 2));
  if (report.results.some((item) => item.state === "failed")) process.exitCode = 1;
}
