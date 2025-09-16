import React, { useContext, useState } from "react"; // <-- Añadir useState al import
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import { DataProvider, DataContext } from './contexts/DataContext';
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Payments from "./pages/Payments";
import BodyComposition from "./pages/BodyComposition";
import Attendance from "./pages/Attendance";
import UserProfile from "./pages/UserProfile";
import LoginPage from "./pages/LoginPage";
import "./App.css";

function App() {
  const { currentUser, loading, logout } = useContext(DataContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // <-- Mover useState aquí, al inicio

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
          <button 
            className="mobile-menu-button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            ☰
          </button>
          <nav>
            <ul className={`nav-links ${isMenuOpen ? 'show' : ''}`}>
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

const AppWrapper = () => (
  <DataProvider>
    <App />
  </DataProvider>
);

export default AppWrapper;