import { useState } from 'react';
import { login, saveSession } from '../api/client';

interface Props {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: Props) {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !password) {
      setError('IDとパスワードを入力してください');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await login(id.trim().toLowerCase(), password);
      saveSession(result);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-icon">z</div>
        <h1>z-data Task</h1>
        <p className="login-desc">ID と パスワードを入力</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="ID (keita / harry / takumi)"
            value={id}
            onChange={e => setId(e.target.value)}
            className="login-input"
            autoComplete="username"
            autoCapitalize="none"
          />
          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="login-input"
            autoComplete="current-password"
          />
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? '接続中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  );
}
