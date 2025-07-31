// src/App.js

import React, { useContext } from "react"; // <-- Asegúrate de que useContext esté importado
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import { DataProvider, DataContext } from './contexts/DataContext'; // <-- Asegúrate de que DataContext esté importado
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Payments from "./pages/Payments";
import BodyComposition from "./pages/BodyComposition";
import Attendance from "./pages/Attendance";
import UserProfile from "./pages/UserProfile";
import LoginPage from "./pages/LoginPage"; // <-- Importar LoginPage
import "./App.css";

// El componente App ahora leerá el contexto para decidir qué mostrar
function App() {
  const { currentUser, loading, logout } = useContext(DataContext); // <-- Obtener el estado de autenticación

  // 1. Mientras se verifica si el usuario está autenticado, mostramos un mensaje de carga
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h2>Cargando...</h2>
      </div>
    );
  }

  // 2. Si no hay usuario autenticado, mostramos la página de inicio de sesión
  if (!currentUser) {
    return (
      <Router>
        <Routes>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </Router>
    );
  }

  // 3. Si hay un usuario autenticado, mostramos la aplicación principal
  return (
    <Router>
      <div className="app">
        <header className="header">
          <h1>ZEUS GYM</h1>
          <nav>
            <ul className="nav-links">
              <li>
                <Link to="/">Dashboard</Link>
              </li>
              <li>
                <Link to="/users">Usuarios</Link>
              </li>
              <li>
                <Link to="/payments">Pagos</Link>
              </li>
              <li>
                <Link to="/body-composition">Composición Corporal</Link>
              </li>
              <li>
                <Link to="/attendance">Asistencia</Link>
              </li>
              <li>
                <button onClick={logout} className="btn-logout">
                  Cerrar Sesión
                </button>
              </li>
            </ul>
          </nav>
        </header>
        <main className="main">
          <div className="container">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/users" element={<Users />} />
              <Route path="/users/:id" element={<UserProfile />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/body-composition" element={<BodyComposition />} />
              <Route path="/attendance" element={<Attendance />} />
              {/* Opcional: redirigir cualquier ruta desconocida al dashboard */}
              <Route path="*" element={<Dashboard />} />
            </Routes>
          </div>
        </main>
        <footer className="footer">
          <p>
            &copy; {new Date().getFullYear()} ZEUS GYM. Todos los derechos
            reservados.
          </p>
        </footer>
      </div>
    </Router>
  );
}

// El componente que exportamos ahora es uno que envuelve App con DataProvider
// Esto asegura que App pueda usar el contexto.
const AppWrapper = () => (
  <DataProvider>
    <App />
  </DataProvider>
);

export default AppWrapper;
