export default class ProtectedPreviewReporter {
  onEnd(result) {
    const code = process.env.QA_PROTECTED_PREVIEW_DIAGNOSTIC_CODE;
    if (code) {
      console.log(`[protected-preview] ${code}:test:${result.status === "passed" ? "passed" : "failed"}`);
      return;
    }
    console.log(result.status === "passed" ? "[protected-preview] passed" : "[protected-preview] failed");
  }
}
