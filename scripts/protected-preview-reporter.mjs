export default class ProtectedPreviewReporter {
  onEnd(result) {
    console.log(result.status === "passed" ? "[protected-preview] passed" : "[protected-preview] failed");
  }
}
