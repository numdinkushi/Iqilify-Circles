"use client"

import * as React from "react"
import { LoaderCircle, Upload } from "lucide-react"
import { toast } from "sonner"

import { ProfileAvatar } from "@/components/profile/profile-avatar"
import { Button } from "@/components/ui/button"
import { isCloudinaryUploadAvailable } from "@/lib/cloudinary/client"
import { useProfile } from "@/hooks/use-profile"
import { markQuestFlag } from "@/lib/quests/evaluate"

type AvatarUploadProps = {
  address: string
  onUploaded?: () => void
}

export function AvatarUpload({ address, onUploaded }: AvatarUploadProps) {
  const { profile, saveProfile } = useProfile(address)
  const [uploading, setUploading] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file (PNG, JPG, WebP).")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB.")
      return
    }

    setUploading(true)
    try {
      const signRes = await fetch("/api/cloudinary/sign", { method: "POST" })
      const signData = await signRes.json()
      if (!signRes.ok) throw new Error(signData.error || "Upload signing failed")

      const form = new FormData()
      form.append("file", file)
      form.append("api_key", signData.apiKey)
      form.append("timestamp", String(signData.timestamp))
      form.append("signature", signData.signature)
      form.append("folder", signData.folder)

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`,
        { method: "POST", body: form }
      )
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) {
        throw new Error(uploadData.error?.message || "Cloudinary upload failed")
      }

      await saveProfile({ avatarUrl: uploadData.secure_url as string })
      markQuestFlag(address, "custom_avatar")
      toast.success("Avatar updated")
      onUploaded?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload avatar")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const cloudConfigured = isCloudinaryUploadAvailable()

  return (
    <div className="flex items-center gap-4">
      <ProfileAvatar
        name={profile?.displayName}
        address={address}
        avatarUrl={profile?.avatarUrl}
        size="lg"
      />
      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading || !cloudConfigured}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <LoaderCircle className="animate-spin" /> : <Upload />}
          {uploading ? "Uploading…" : "Upload avatar"}
        </Button>
        {!cloudConfigured ? (
          <p className="text-xs text-muted-foreground">Set CLOUDINARY_* env vars to enable uploads.</p>
        ) : (
          <p className="text-xs text-muted-foreground">PNG/JPG/WebP · max 5 MB · hosted on Cloudinary</p>
        )}
      </div>
    </div>
  )
}
