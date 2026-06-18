import { NextResponse } from "next/server"

import { createUploadSignature, isCloudinaryConfigured } from "@/lib/cloudinary/server"

export async function POST() {
  if (!isCloudinaryConfigured()) {
    return NextResponse.json({ error: "Cloudinary is not configured." }, { status: 503 })
  }

  try {
    const timestamp = Math.round(Date.now() / 1000)
    const signed = createUploadSignature({ timestamp })
    return NextResponse.json(signed)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not sign upload." },
      { status: 500 }
    )
  }
}
