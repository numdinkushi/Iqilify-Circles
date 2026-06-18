"use client"

import * as React from "react"
import { LoaderCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useProfile } from "@/hooks/use-profile"

type DisplayNameFieldProps = {
  address: string
}

export function DisplayNameField({ address }: DisplayNameFieldProps) {
  const { profile, saveProfile } = useProfile(address)
  const [value, setValue] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    setValue(profile?.displayName ?? "")
  }, [profile?.displayName])

  async function save() {
    setSaving(true)
    try {
      await saveProfile({ displayName: value.trim() || undefined })
      toast.success("Display name saved")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save name")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="display-name">Display name</Label>
      <div className="flex gap-2">
        <Input
          id="display-name"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="How you appear on the leaderboard"
          maxLength={48}
        />
        <Button type="button" variant="outline" onClick={save} disabled={saving}>
          {saving ? <LoaderCircle className="animate-spin" /> : "Save"}
        </Button>
      </div>
    </div>
  )
}
