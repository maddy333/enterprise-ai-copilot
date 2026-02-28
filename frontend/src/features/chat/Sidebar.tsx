import { useState, useEffect } from 'react';
import { MessageSquarePlus, LogOut, Database, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { DocumentManager } from '../documents/DocumentManager';
import api from '../../services/api';
import clsx from 'clsx';

interface Session {
    id: string;
    title: string;
    created_at: string;
}

interface SidebarProps {
    onSessionSelect: (sessionId: string | null) => void;
    currentSessionId: string | null;
}

export function Sidebar({ onSessionSelect, currentSessionId }: SidebarProps) {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [showDocs, setShowDocs] = useState(false);
    const { user, logout } = useAuthStore();

    const loadSessions = async () => {
        try {
            const res = await api.get('/chat/sessions');
            setSessions(res.data);
        } catch (err) {
            console.error('Failed to load sessions', err);
        }
    };

    useEffect(() => {
        loadSessions();
    }, [currentSessionId]);

    return (
        <>
            <div className="w-72 bg-[#f9f9f9] dark:bg-[#18181b] border-r border-gray-200 dark:border-border h-screen flex flex-col transition-colors">
                {/* Top actions */}
                <div className="p-4 space-y-2">
                    <button
                        onClick={() => onSessionSelect(null)}
                        className="w-full flex items-center gap-3 px-3 py-3 bg-white dark:bg-card border border-gray-200 dark:border-border hover:border-primary/50 text-foreground text-sm font-medium rounded-xl shadow-sm transition-all"
                    >
                        <MessageSquarePlus className="w-4 h-4 text-primary" />
                        New Chat
                    </button>

                    <button
                        onClick={() => setShowDocs(true)}
                        className="w-full flex items-center gap-3 px-3 py-3 bg-white dark:bg-card border border-transparent hover:border-gray-200 dark:hover:border-border text-foreground text-sm font-medium rounded-xl transition-all"
                    >
                        <Database className="w-4 h-4 text-muted-foreground" />
                        Knowledge Base
                    </button>
                </div>

                {/* History List */}
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
                    <div className="px-3 pb-2 text-xs font-semibold text-gray-400 dark:text-muted-foreground uppercase tracking-wider">Chat History</div>
                    {sessions.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => onSessionSelect(s.id)}
                            className={clsx(
                                "w-full text-left px-3 py-2.5 rounded-lg text-sm truncate transition-colors",
                                currentSessionId === s.id
                                    ? "bg-gray-200 dark:bg-secondary text-foreground font-medium"
                                    : "text-gray-600 dark:text-muted-foreground hover:bg-gray-100 dark:hover:bg-input"
                            )}
                        >
                            {s.title}
                        </button>
                    ))}
                    {sessions.length === 0 && (
                        <div className="px-3 py-4 text-sm text-gray-400 dark:text-muted-foreground italic">No past conversations</div>
                    )}
                </div>

                {/* Bottom Profile */}
                <div className="p-4 border-t border-gray-200 dark:border-border">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <UserIcon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 truncate">
                            <p className="text-sm font-medium text-foreground truncate">{user?.full_name || 'User'}</p>
                            <p className="text-xs text-gray-500 dark:text-muted-foreground truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-3 py-2 text-gray-600 dark:text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors text-sm font-medium"
                    >
                        <LogOut className="w-4 h-4" />
                        Log out
                    </button>
                </div>
            </div>

            {showDocs && <DocumentManager onClose={() => setShowDocs(false)} />}
        </>
    );
}
