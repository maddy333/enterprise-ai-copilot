import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { ChatInterface } from './ChatInterface';

export default function ChatLayout() {
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

    // Hack to force refresh of Sidebar when session is created
    const [refreshKey, setRefreshKey] = useState(0);

    const handleSessionCreated = (id: string) => {
        if (id === 'trigger_refresh') {
            setRefreshKey(prev => prev + 1);
            // Ideally we'd also select the new session id
        } else {
            setCurrentSessionId(id);
            setRefreshKey(prev => prev + 1);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar
                key={refreshKey}
                currentSessionId={currentSessionId}
                onSessionSelect={setCurrentSessionId}
            />
            <div className="flex-1 min-w-0">
                <ChatInterface
                    sessionId={currentSessionId}
                    onSessionCreated={handleSessionCreated}
                />
            </div>
        </div>
    );
}
