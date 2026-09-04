import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") return new NextResponse(null, { status: 404 });

  return NextResponse.json({
    environment: process.env.VERCEL_ENV,
    projectId: process.env.VERCEL_PROJECT_ID,
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
    gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF,
  }, { headers: { "Cache-Control": "no-store" } });
}
