"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { profileInitials } from "@/lib/profile/storage"
import { cn } from "@/lib/utils"

type ProfileAvatarProps = {
  name?: string
  address?: string
  avatarUrl?: string | null
  size?: "sm" | "default" | "lg"
  className?: string
}

export function ProfileAvatar({
  name,
  address,
  avatarUrl,
  size = "default",
  className,
}: ProfileAvatarProps) {
  const initials = profileInitials(name, address)

  return (
    <Avatar size={size} className={cn(className)}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={name ?? "Profile avatar"} /> : null}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  )
}
