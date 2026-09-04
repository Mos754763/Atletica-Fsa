import { assertProtectedPreviewTarget } from "./protected-preview-target.mjs";
import { verifyProtectedPreviewIdentity } from "./run-protected-preview-e2e.mjs";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`O executor protegido não forneceu ${name}.`);
  return value;
}

export default async function globalSetup() {
  const origin = assertProtectedPreviewTarget(required("QA_PROTECTED_PREVIEW_ORIGIN"));
  const userAgent = required("QA_PROTECTED_PREVIEW_USER_AGENT");
  const bypass = required("QA_PROTECTED_PREVIEW_BYPASS_HEADER");
  await verifyProtectedPreviewIdentity(origin, {
    "User-Agent": userAgent,
    "x-vercel-protection-bypass": bypass,
  });
}
