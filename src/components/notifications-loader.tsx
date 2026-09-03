"use client"

import { useQuery } from "@tanstack/react-query"
import { Notifications, type NotificationItem } from "@/components/notifications"

export function NotificationsLoader() {
  const { data } = useQuery<{ notifications: NotificationItem[] }>({
    queryKey: ["notifications"],
    queryFn: () => fetch("/api/notifications").then((r) => r.json()),
    refetchInterval: 60000, // refresh every minute
    staleTime: 30000,
  })

  return <Notifications items={data?.notifications ?? []} />
}
