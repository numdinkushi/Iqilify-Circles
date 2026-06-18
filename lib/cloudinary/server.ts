import { createHash } from "crypto"

export type CloudinaryConfig = {
  cloudName: string
  apiKey: string
  apiSecret: string
}

export function getCloudinaryConfig(): CloudinaryConfig | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim()
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim()
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim()
  if (!cloudName || !apiKey || !apiSecret) return null
  return { cloudName, apiKey, apiSecret }
}

export function isCloudinaryConfigured() {
  return getCloudinaryConfig() !== null
}

export function getPublicCloudName() {
  return process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? ""
}

const UPLOAD_FOLDER = "iqlify/avatars"

export function createUploadSignature(params: { timestamp: number; folder?: string }) {
  const config = getCloudinaryConfig()
  if (!config) throw new Error("Cloudinary is not configured.")

  const folder = params.folder ?? UPLOAD_FOLDER
  const toSign = `folder=${folder}&timestamp=${params.timestamp}${config.apiSecret}`
  const signature = createHash("sha1").update(toSign).digest("hex")

  return {
    signature,
    timestamp: params.timestamp,
    folder,
    cloudName: config.cloudName,
    apiKey: config.apiKey,
  }
}

export const CLOUDINARY_UPLOAD_FOLDER = UPLOAD_FOLDER
