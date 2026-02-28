import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Bot, User as UserIcon, Loader2, Quote } from 'lucide-react';
import clsx from 'clsx';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    citations?: Array<{ doc_id: string }>;
}

export function ChatInterface({ sessionId, onSessionCreated }: { sessionId: string | null; onSessionCreated: (id: string) => void }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const { token } = useAuthStore();

    useEffect(() => {
        if (sessionId) {
            loadHistory();
        } else {
            setMessages([]);
        }
    }, [sessionId]);

    const loadHistory = async () => {
        try {
            const res = await api.get(`/chat/sessions/${sessionId}/history`);
            setMessages(res.data);
            scrollToBottom();
        } catch (err) {
            console.error("Failed to load history", err);
        }
    };

    const scrollToBottom = () => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isGenerating]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isGenerating) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsGenerating(true);

        try {
            // Create a temporary message for the assistant
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/chat/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: userMessage, session_id: sessionId })
            });

            if (!response.body) throw new Error("No response body");
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");

            let fullContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6);
                        if (!dataStr) continue;

                        try {
                            const data = JSON.parse(dataStr);
                            if (data.content) {
                                fullContent += data.content;
                                setMessages(prev => {
                                    const newMsgs = [...prev];
                                    newMsgs[newMsgs.length - 1].content = fullContent;
                                    return newMsgs;
                                });
                            } else if (data.citations) {
                                setMessages(prev => {
                                    const newMsgs = [...prev];
                                    newMsgs[newMsgs.length - 1].citations = data.citations;
                                    return newMsgs;
                                });
                            }
                        } catch (e) {
                            console.error("Error parsing stream JSON", e);
                        }
                    }
                }
            }

            // If this was a new session, we need to refresh the sidebar
            // A robust implementation would return the session ID first in the stream if created
            if (!sessionId) {
                // Hack to trigger refresh since our stream didn't strictly embed the new session ID
                onSessionCreated('trigger_refresh');
            }

        } catch (err) {
            console.error("Streaming error", err);
            setMessages(prev => {
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1].content = "⚠️ An error occurred while generating the response.";
                return newMsgs;
            });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-screen bg-white dark:bg-background relative">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto scroll-smooth">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                            <Bot className="w-8 h-8 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-foreground mb-2">How can I help you today?</h2>
                        <p className="text-gray-500 dark:text-muted-foreground max-w-md">
                            Upload documents in the Knowledge Base, then ask me questions to synthesize insights, find exact quotes, or summarize large PDFs.
                        </p>
                    </div>
                ) : (
                    <div className="w-full max-w-4xl mx-auto divide-y divide-gray-100 dark:divide-border/50">
                        {messages.map((msg, i) => (
                            <div key={i} className={clsx("w-full py-8 px-4 sm:px-8", msg.role === 'assistant' ? "bg-gray-50 dark:bg-card/50" : "")}>
                                <div className="max-w-3xl mx-auto flex gap-6">
                                    <div className="flex-shrink-0 mt-1">
                                        {msg.role === 'assistant' ? (
                                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-md">
                                                <Bot className="w-5 h-5 text-primary-foreground" />
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-secondary flex items-center justify-center border border-gray-300 dark:border-border">
                                                <UserIcon className="w-5 h-5 text-gray-600 dark:text-muted-foreground" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        <div className="prose prose-slate dark:prose-invert max-w-none text-sm md:text-base leading-relaxed break-words">
                                            {msg.content === '' && isGenerating && i === messages.length - 1 ? (
                                                <div className="flex items-center gap-2 text-gray-400">
                                                    <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
                                                </div>
                                            ) : (
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                            )}
                                        </div>

                                        {/* Citations Footer */}
                                        {msg.citations && msg.citations.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-border/50">
                                                <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-muted-foreground">
                                                    <Quote className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary/70" />
                                                    <div>
                                                        <span className="font-semibold text-gray-700 dark:text-gray-300">Sources: </span>
                                                        {msg.citations.map((c, idx) => (
                                                            <span key={idx} className="mr-2 px-2 py-0.5 bg-gray-100 dark:bg-secondary rounded-md font-mono text-[10px] border border-gray-200 dark:border-border">
                                                                {c.doc_id.split('-')[0]}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={bottomRef} className="h-6" />
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 pb-8 bg-gradient-to-t from-white via-white to-transparent dark:from-background dark:via-background z-10">
                <form onSubmit={handleSubmit} className="relative shadow-xl rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-card focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-transparent transition-all overflow-hidden">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e);
                            }
                        }}
                        placeholder="Ask anything about your documents..."
                        className="w-full max-h-48 min-h-[60px] resize-none py-4 pl-6 pr-16 bg-transparent border-none focus:ring-0 text-foreground text-sm md:text-base placeholder-gray-400 dark:placeholder-muted-foreground outline-none"
                        rows={1}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isGenerating}
                        className="absolute right-3 bottom-3 p-2.5 rounded-xl bg-primary hover:bg-primary/90 disabled:bg-gray-200 dark:disabled:bg-secondary disabled:text-gray-400 dark:disabled:text-muted-foreground text-white transition-all disabled:cursor-not-allowed shadow-sm"
                    >
                        {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
                    </button>
                </form>
                <p className="text-center text-xs text-gray-400 dark:text-muted-foreground mt-4 font-medium">
                    Enterprise Copilot can make mistakes. Verify important information against the raw knowledge base.
                </p>
            </div>
        </div>
    );
}
