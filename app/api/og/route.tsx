import { ImageResponse } from "next/og"
import type { NextRequest } from "next/server"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const score = searchParams.get("score") ?? "84"
  const track = searchParams.get("track") ?? "builder"
  const name = searchParams.get("name") ?? "IQlify builder"

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px",
          background: "linear-gradient(135deg, #022c22 0%, #064e3b 45%, #0f172a 100%)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            IQ
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>IQlify</div>
            <div style={{ fontSize: 18, opacity: 0.75 }}>AI interview prep on Circles</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 24, opacity: 0.85, textTransform: "capitalize" }}>
            {track} track
          </div>
          <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: 28, opacity: 0.9 }}>{name}</div>
        </div>

        <div style={{ fontSize: 22, opacity: 0.7 }}>Practice interviews · earn CRC on Gnosis</div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
