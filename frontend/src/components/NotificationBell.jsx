import { useEffect, useMemo, useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import {
  clearNotifications,
  getNotifications,
  markAllRead,
  markRead,
  subscribeNotifications
} from '../lib/notifications';

const formatTimestamp = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const NotificationBell = ({ className = '', iconClassName = '' }) => {
  const [notifications, setNotifications] = useState(() => getNotifications());

  useEffect(() => {
    return subscribeNotifications(setNotifications);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const handleMarkAll = () => {
    markAllRead();
  };

  const handleClear = () => {
    clearNotifications();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`relative flex items-center justify-center h-10 w-10 rounded-full border border-slate-200 text-[#0A2540] hover:border-[#2ECC71] hover:text-[#2ECC71] transition-colors duration-200 ${className}`}
          aria-label="Notifications"
        >
          <Bell className={`w-5 h-5 ${iconClassName}`} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[#2ECC71] text-white text-[10px] font-semibold flex items-center justify-center px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 bg-white border border-slate-200 shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div>
            <p className="text-sm font-semibold text-[#0A2540]">Notifications</p>
            <p className="text-[11px] text-[#64748B]">
              {unreadCount} non lues
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleMarkAll}>
              Tout lire
            </Button>
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-sm text-[#64748B] text-center">
              Aucune notification pour le moment.
            </div>
          ) : (
            notifications.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => markRead(item.id)}
                className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition ${
                  item.read ? 'bg-white' : 'bg-emerald-50/40'
                }`}
                aria-label={`Notification ${index + 1}`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1 h-2 w-2 rounded-full ${
                      item.read ? 'bg-slate-300' : 'bg-[#2ECC71]'
                    }`}
                  ></span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#0A2540]">
                        {item.title}
                      </p>
                      {item.read && <Check className="w-4 h-4 text-[#2ECC71]" />}
                    </div>
                    {item.description && (
                      <p className="text-xs text-[#64748B] mt-1">
                        {item.description}
                      </p>
                    )}
                    <p className="text-[11px] text-[#94A3B8] mt-2">
                      {formatTimestamp(item.created_at)}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
        {notifications.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-200">
            <Button variant="ghost" size="sm" onClick={handleClear}>
              Effacer tout
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
