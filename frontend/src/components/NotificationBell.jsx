import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { api } from '../api/client'
import {
  deleteNotificationItem,
  fetchNotifications,
  getBackendOrigin,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/groupProjectService'

const NOTIF_ICON_MAP = {
  task_assigned: {
    icon: 'assignment_ind',
    color: 'text-secondary bg-secondary-fixed/50',
  },
  chat_message: {
    icon: 'chat',
    color: 'text-blue-600 bg-blue-50',
  },
  file_uploaded: {
    icon: 'attach_file',
    color: 'text-emerald-600 bg-emerald-50',
  },
  member_added: {
    icon: 'group_add',
    color: 'text-purple-600 bg-purple-50',
  },
  member_role_updated: {
    icon: 'manage_accounts',
    color: 'text-amber-600 bg-amber-50',
  },
}

function formatRelativeTime(isoDate) {
  if (!isoDate) return ''
  const diffSec = Math.max(
    0,
    Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000)
  )
  if (diffSec < 60) return "À l'instant"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `Il y a ${diffMin} min`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `Il y a ${diffHours} h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `Il y a ${diffDays} j`
  return new Date(isoDate).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  })
}

function getStoredToken() {
  return (
    api.getToken?.() ||
    localStorage.getItem('taskflow_token') ||
    localStorage.getItem('token')
  )
}

export default function NotificationBell({ user, onShowToast }) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef(null)

  const userId = user?.id || user?._id || null

  const refreshNotifications = useCallback(async () => {
    if (!userId || !getStoredToken()) return
    setLoading(true)
    try {
      const data = await fetchNotifications(40)
      setItems(Array.isArray(data?.items) ? data.items : [])
      setUnreadCount(Number(data?.unreadCount ?? 0))
    } catch {
      // Silencieux si non authentifié ou hors-ligne
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    const token = getStoredToken()
    if (!userId || !token) return

    let active = true
    fetchNotifications(40)
      .then((data) => {
        if (!active) return
        setItems(Array.isArray(data?.items) ? data.items : [])
        setUnreadCount(Number(data?.unreadCount ?? 0))
      })
      .catch(() => {
        // Silencieux
      })

    const socket = io(getBackendOrigin(), {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      socket.emit('user:join', userId)
    })

    socket.on('notification:new', (newNotif) => {
      if (!newNotif) return
      setItems((prev) => {
        if (prev.some((n) => n.id === newNotif.id)) return prev
        return [newNotif, ...prev]
      })
      setUnreadCount((prev) => prev + 1)
      if (onShowToast) {
        onShowToast(
          `🔔 ${newNotif.actorName || 'TaskFlow'} ${newNotif.message || ''}`
        )
      }
    })

    return () => {
      active = false
      socket.disconnect()
    }
  }, [userId, onShowToast])

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  if (!userId) return null

  async function handleMarkRead(notif) {
    if (!notif.read) {
      try {
        await markNotificationRead(notif.id)
        setItems((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } catch {
        // ignore
      }
    }
    if (notif.projectId) {
      setIsOpen(false)
      navigate(`/projects/${notif.projectId}`)
    }
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0) return
    try {
      await markAllNotificationsRead()
      setItems((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch {
      // ignore
    }
  }

  async function handleDelete(e, notif) {
    e.stopPropagation()
    try {
      await deleteNotificationItem(notif.id)
      setItems((prev) => prev.filter((n) => n.id !== notif.id))
      if (!notif.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          const next = !isOpen
          setIsOpen(next)
          if (next) refreshNotifications()
        }}
        className="relative w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container border border-outline-variant/25 flex items-center justify-center transition-colors cursor-pointer text-on-surface"
        aria-label="Centre de notifications"
        title="Notifications en temps réel"
      >
        <span className="material-symbols-outlined text-[18px]">
          notifications
        </span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-secondary text-on-secondary text-[10px] font-extrabold flex items-center justify-center shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed sm:absolute right-3 sm:right-0 top-14 sm:top-10 w-[calc(100vw-1.5rem)] sm:w-96 max-h-[75vh] bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-2xl z-50 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container-low/50">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[18px]">
                notifications_active
              </span>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-on-surface">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold">
                  {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-secondary hover:underline cursor-pointer"
              >
                Tout marquer lu
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/10">
            {loading && items.length === 0 ? (
              <div className="py-10 text-center text-xs text-outline">
                Chargement des notifications...
              </div>
            ) : items.length === 0 ? (
              <div className="py-10 px-4 text-center flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-outline/50 text-[32px]">
                  notifications_off
                </span>
                <p className="text-xs font-semibold text-on-surface-variant">
                  Aucune notification pour le moment
                </p>
                <p className="text-[11px] text-outline">
                  Vous serez alerté en direct des assignations, messages et
                  fichiers partagés.
                </p>
              </div>
            ) : (
              items.map((notif) => {
                const meta = NOTIF_ICON_MAP[notif.type] || {
                  icon: 'notifications',
                  color: 'text-on-surface-variant bg-surface-container',
                }
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleMarkRead(notif)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleMarkRead(notif)
                      }
                    }}
                    className={`px-4 py-3 flex items-start gap-3 transition-colors cursor-pointer hover:bg-surface-container-low/80 ${
                      !notif.read ? 'bg-secondary-fixed/15' : ''
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${meta.color}`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {meta.icon}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-bold text-on-surface truncate">
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-outline shrink-0">
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-0.5 leading-snug break-words">
                        <strong className="text-on-surface font-semibold">
                          {notif.actorName || 'TaskFlow'}
                        </strong>{' '}
                        {notif.message}
                      </p>
                      {notif.projectId && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-secondary mt-1">
                          <span>Ouvrir le projet</span>
                          <span className="material-symbols-outlined text-[12px]">
                            arrow_forward
                          </span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!notif.read && (
                        <span
                          className="w-2 h-2 rounded-full bg-secondary"
                          title="Non lue"
                        ></span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, notif)}
                        className="w-6 h-6 rounded-lg hover:bg-surface-container flex items-center justify-center text-outline hover:text-on-surface cursor-pointer"
                        title="Supprimer cette notification"
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          close
                        </span>
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
