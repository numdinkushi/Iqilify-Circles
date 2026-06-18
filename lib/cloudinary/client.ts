/** Client-safe Cloudinary availability check (cloud name is public). */
export function isCloudinaryUploadAvailable() {
  return !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim()
}
 