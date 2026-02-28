import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { LogIn, Loader2 } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const setToken = useAuthStore((state) => state.setToken);
    const setUser = useAuthStore((state) => state.setUser);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // OAuth2PasswordRequestForm expects FormData
            const formData = new FormData();
            formData.append('username', email);
            formData.append('password', password);

            const res = await api.post('/auth/token', formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            setToken(res.data.access_token);

            // Fetch user profile
            const userRes = await api.get('/auth/me', {
                headers: { Authorization: `Bearer ${res.data.access_token}` },
            });
            setUser(userRes.data);

            navigate('/chat');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background">
            <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-card rounded-2xl shadow-xl border border-gray-100 dark:border-border">
                <div className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <LogIn className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-foreground">Log in to Copilot</h1>
                    <p className="text-sm text-gray-500 dark:text-muted-foreground mt-2">Enter your credentials to access your workspace</p>
                </div>

                {error && (
                    <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                        <input
                            type="email"
                            required
                            className="mt-1 w-full px-4 py-2 bg-gray-50 dark:bg-input border border-gray-200 dark:border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-foreground"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                        <input
                            type="password"
                            required
                            className="mt-1 w-full px-4 py-2 bg-gray-50 dark:bg-input border border-gray-200 dark:border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-foreground"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors flex justify-center items-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
                    </button>
                </form>

                <p className="text-center text-sm text-gray-500 dark:text-muted-foreground">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-primary hover:underline font-medium">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}
