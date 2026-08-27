import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import { authenticate } from '../auth';

export default function LoginScreen({ onSignIn, darkMode }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (checking) return;
    setChecking(true);
    setError('');
    try {
      const user = await authenticate(username, password);
      if (user) onSignIn(user);
      else setError('Wrong login or password');
    } catch (err) {
      console.error('Sign in error:', err);
      setError('Could not check the password in this browser');
    } finally {
      setChecking(false);
    }
  };

  const labelClass = darkMode ? 'text-gray-300' : 'text-gray-700';
  const inputClass = `w-full min-w-0 px-3 py-2 border rounded-lg focus:outline-none focus:border-green-500 ${
    darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
  }`;

  return (
    <div className={`flex-1 flex items-center justify-center p-4 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <form
        onSubmit={handleSubmit}
        className={`w-full max-w-sm rounded-lg border p-6 sm:p-8 ${
          darkMode ? 'border-gray-800 bg-gray-800/60' : 'border-gray-200 bg-white'
        }`}
      >
        <h1 className={`text-xl sm:text-2xl font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Surf the Task
        </h1>
        <p className={`text-xs mb-6 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Sign in to open the board
        </p>

        <label className={`block text-sm font-medium mb-2 ${labelClass}`}>
          Login
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            className={`${inputClass} mt-1 font-normal`}
          />
        </label>

        <label className={`block text-sm font-medium mt-4 mb-2 ${labelClass}`}>
          Password
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            className={`${inputClass} mt-1 font-normal`}
          />
        </label>

        {error && <p className="text-xs mt-3 text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={checking || !username || !password}
          className="w-full mt-6 px-4 py-2 rounded-lg font-medium bg-green-800 text-white hover:bg-green-900 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 press"
        >
          <LogIn size={16} />
          {checking ? 'Checking...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
