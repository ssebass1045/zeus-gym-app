import React, { useState, useContext } from "react";
import { DataContext } from "../contexts/DataContext";
import { Link } from "react-router-dom";

const Users = () => {
  const { users, addUser, updateUser, deleteUser } = useContext(DataContext);
  const [newUser, setNewUser] = useState({
    nombre: "",
    direccion: "",
    telefono: "",
    plan: "Mensualidad",
    pagoRealizado: 0,
    fechaIngreso: new Date().toISOString().split("T")[0],
    genero: "Masculino",
    peso: "",
    cumpleanos: "",
    altura: "",
    observaciones: "",
  });
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' }); 

  const handleInputChange = (e) => {
    setNewUser({ ...newUser, [e.target.name]: e.target.value });
  };


  // --- NUEVA FUNCIÓN: handleDeleteUser ---
  const handleDeleteUser = (userId, userName) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar a ${userName}? Esta acción es irreversible.`)) {
      deleteUser(userId);
      alert(`${userName} ha sido eliminado correctamente.`);
    }
  };
  // --- FIN NUEVA FUNCIÓN ---

  const handleSubmit = (e) => {
    e.preventDefault();
    const planPrices = {
      Quincena: 40000,
      Mensualidad: 80000,
      Tiquetera: 50000,
    };

    const calculateIMC = (weight, height) => {
      if (!weight || !height) return 0;
      const heightInMeters = height / 100;
      return (weight / (heightInMeters * heightInMeters)).toFixed(2);
    };

    const getIMCCategory = (imc) => {
      if (imc < 18.5) return "Bajo peso";
      if (imc >= 18.5 && imc <= 24.9) return "Peso normal";
      if (imc >= 25 && imc <= 29.9) return "Sobrepeso";
      if (imc >= 30 && imc <= 34.9) return "Obesidad grado I";
      if (imc >= 35 && imc <= 39.9) return "Obesidad grado II";
      return "Obesidad grado III";
    };

    const calculateDueDate = (plan, startDate) => {
      const date = new Date(startDate);
      if (plan === "Quincena") {
        date.setDate(date.getDate() + 15);
      } else if (plan === "Mensualidad") {
        date.setMonth(date.getMonth() + 1);
      }
      return date.toISOString().split("T")[0];
    };

    const imc = calculateIMC(
      parseFloat(newUser.peso),
      parseFloat(newUser.altura)
    );
    const imcCategory = getIMCCategory(imc);
    const fechaVencimiento = calculateDueDate(
      newUser.plan,
      newUser.fechaIngreso
    );
    const costoPlan = planPrices[newUser.plan];
    const debe = costoPlan - parseFloat(newUser.pagoRealizado);

        addUser({
      ...newUser,
      pagoRealizado: parseFloat(newUser.pagoRealizado || 0), // <-- ¡Añadir/Modificar esta línea!
      id: Date.now(), // Simple ID generation
      imc: imc,
      imcCategory: imcCategory,
      fechaVencimiento: fechaVencimiento,
      precioPlan: costoPlan,
      debe: debe,
      diasHabilesRestantes: newUser.plan === "Tiquetera" ? 15 : 0,
      diasAsistencia: 0,
      historialPagos: [
        {
          fecha: new Date().toISOString().split("T")[0],
          monto: parseFloat(newUser.pagoRealizado || 0), // También es bueno añadir '|| 0' aquí
          tipo: "Inicial",
        },
      ],
      historialMedidas: [],
    });

    // Reset form
    setNewUser({
      nombre: "",
      direccion: "",
      telefono: "",
      plan: "Mensualidad",
      pagoRealizado: 0,
      fechaIngreso: new Date().toISOString().split("T")[0],
      genero: "Masculino",
      peso: "",
      cumpleanos: "",
      altura: "",
      observaciones: "",
    });
  };

  // --- NUEVA LÓGICA DE FILTRADO ---
  const filteredUsers = users.filter(user =>
    user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.telefono.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.direccion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.plan.toLowerCase().includes(searchTerm.toLowerCase())
  );
  // --- FIN NUEVA LÓGICA DE FILTRADO ---
  // --- NUEVA LÓGICA DE ORDENACIÓN ---
  const sortedUsers = React.useMemo(() => {
    let sortableUsers = [...filteredUsers];
    if (sortConfig.key !== null) {
      sortableUsers.sort((a, b) => {
        // Manejar fechas y otros tipos de datos
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (sortConfig.key === 'fechaVencimiento') {
          // Tratar fechas nulas o 'N/A' como muy lejanas
          const dateA = aValue && aValue !== 'N/A (Tiquetera)' ? new Date(aValue) : new Date('9999-12-31');
          const dateB = bValue && bValue !== 'N/A (Tiquetera)' ? new Date(bValue) : new Date('9999-12-31');
          if (dateA < dateB) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
          }
          if (dateA > dateB) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
          }
          return 0;
        } else {
          // Ordenación genérica para otros campos
          if (aValue < bValue) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
          }
          if (aValue > bValue) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
          }
          return 0;
        }
      });
    }
    return sortableUsers;
  }, [filteredUsers, sortConfig]);
  // --- FIN NUEVA LÓGICA DE ORDENACIÓN ---

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="users">
      <h2>Gestión de Usuarios</h2>

      {/* --- NUEVO: Campo de Búsqueda --- */}
      <div className="search-bar card">
        {" "}
        {/* Usamos la clase 'card' para el estilo */}
        <input
          type="text"
          placeholder="Buscar usuarios por nombre, teléfono, dirección o plan..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-control" // Reutilizamos la clase de estilo de formulario
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "5px",
            border: "1px solid #ddd",
          }} // Estilos básicos
        />
      </div>
      {/* --- FIN NUEVO --- */}

      <div className="add-user-section">
        {" "}
        {/* Contenedor para el botón y el formulario */}
        <button
          className="btn btn-primary"
          onClick={() => setShowAddUserForm(!showAddUserForm)}
          style={{ marginBottom: "20px" }} // Puedes mover este estilo a App.css si lo prefieres
        >
          {showAddUserForm ? "Ocultar Formulario" : "Añadir Nuevo Usuario"}
        </button>
        {showAddUserForm && ( // Esto renderiza el formulario SOLO si showAddUserForm es true
          <div className="card add-user-form-container">
            {" "}
            {/* Añadimos 'card' para mantener el estilo */}
            <h3>Agregar Nuevo Usuario</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre:</label>
                <input
                  type="text"
                  name="nombre"
                  value={newUser.nombre}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Dirección:</label>
                <input
                  type="text"
                  name="direccion"
                  value={newUser.direccion}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Teléfono:</label>
                <input
                  type="text"
                  name="telefono"
                  value={newUser.telefono}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Plan:</label>
                <select
                  name="plan"
                  value={newUser.plan}
                  onChange={handleInputChange}
                >
                  <option value="Quincena">Quincena ($40,000)</option>
                  <option value="Mensualidad">Mensualidad ($80,000)</option>
                  <option value="Tiquetera">
                    Tiquetera ($50,000 - 15 días hábiles)
                  </option>
                </select>
              </div>
              <div className="form-group">
                <label>Pago Realizado:</label>
                <input
                  type="number"
                  name="pagoRealizado"
                  value={newUser.pagoRealizado}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Fecha de Ingreso:</label>
                <input
                  type="date"
                  name="fechaIngreso"
                  value={newUser.fechaIngreso}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Género:</label>
                <select
                  name="genero"
                  value={newUser.genero}
                  onChange={handleInputChange}
                >
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>
              </div>
              <div className="form-group">
                <label>Peso (kg):</label>
                <input
                  type="number"
                  name="peso"
                  value={newUser.peso}
                  onChange={handleInputChange}
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="form-group">
                <label>Altura (cm):</label>
                <input
                  type="number"
                  name="altura"
                  value={newUser.altura}
                  onChange={handleInputChange}
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="form-group">
                <label>Cumpleaños:</label>
                <input
                  type="date"
                  name="cumpleanos"
                  value={newUser.cumpleanos}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Observaciones Médicas:</label>
                <textarea
                  name="observaciones"
                  value={newUser.observaciones}
                  onChange={handleInputChange}
                ></textarea>
              </div>
              <button type="submit" className="btn btn-primary">
                Agregar Usuario
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Lista de Usuarios</h3>
        <table className="table">
          <thead>
            <tr>
              <th onClick={() => requestSort('nombre')}>Nombre</th>
              <th onClick={() => requestSort('plan')}>Plan</th>
              <th onClick={() => requestSort('fechaVencimiento')}>Vencimiento</th>
              <th onClick={() => requestSort('debe')}>Deuda</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.nombre}</td>
                <td>{user.plan}</td>
                <td>{new Date(user.fechaVencimiento).toLocaleDateString()}</td>
                <td>${user.debe.toLocaleString()}</td>
                <td>
                  <Link to={`/users/${user.id}`} className="btn btn-primary">
                    Ver Perfil
                  </Link>
                  {/* --- NUEVO BOTÓN: Eliminar Usuario --- */}
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDeleteUser(user.id, user.nombre)}
                    style={{ marginLeft: "10px" }} // Espacio entre botones, puedes moverlo a CSS
                  >
                    Eliminar
                  </button>
                  {/* --- FIN NUEVO BOTÓN --- */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;
