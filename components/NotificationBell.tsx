'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';

type Notification = {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-medium text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
            <span className="text-sm font-medium text-gray-900">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-blue-600 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-center text-sm text-gray-500">Loading…</p>
            ) : notifications.length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-500">No notifications</p>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-gray-100 px-3 py-2 last:border-0 ${!n.read ? 'bg-blue-50/50' : ''}`}
                >
                  {n.link ? (
                    <Link
                      href={n.link}
                      onClick={() => {
                        if (!n.read) markAsRead(n.id);
                        setOpen(false);
                      }}
                      className="block text-sm"
                    >
                      <p className="font-medium text-gray-900">{n.title}</p>
                      {n.message && <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">{n.message}</p>}
                      <p className="mt-0.5 text-xs text-gray-400">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </p>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (!n.read) markAsRead(n.id);
                      }}
                      className="block w-full text-left text-sm"
                    >
                      <p className="font-medium text-gray-900">{n.title}</p>
                      {n.message && <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">{n.message}</p>}
                      <p className="mt-0.5 text-xs text-gray-400">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </p>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
