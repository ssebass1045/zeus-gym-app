// src/pages/LoginPage.js
import React, { useState } from 'react';
import { auth } from '../firebaseConfig'; // <-- Importar 'auth' de tu configuración de Firebase
import { signInWithEmailAndPassword } from 'firebase/auth'; // <-- Importar la función de inicio de sesión
import './LoginPage.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => { // <-- Convertir la función a 'async'
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Intentar iniciar sesión con Firebase
      await signInWithEmailAndPassword(auth, email, password);
      // Si el inicio de sesión es exitoso, el listener 'onAuthStateChanged' en DataContext
      // se encargará de redirigir al usuario a la aplicación principal.
    } catch (err) {
      // Manejar errores comunes de Firebase
      let errorMessage = "Ocurrió un error al iniciar sesión. Por favor, inténtalo de nuevo.";
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMessage = "Correo electrónico o contraseña incorrectos.";
      }
      setError(errorMessage);
      console.error("Error de inicio de sesión:", err.code, err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h2>Iniciar Sesión - ZEUS GYM</h2>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Correo Electrónico</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
