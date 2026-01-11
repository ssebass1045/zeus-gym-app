import React, { useState, useContext } from "react";
import { DataContext } from "../contexts/DataContext";
import { Link } from "react-router-dom";
import "./Users.css";

const Users = () => {
  const { users, addUser, deleteUser, clearSmallDebts } = useContext(DataContext);
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
  const [sortConfig, setSortConfig] = useState({ key: 'nombre', direction: 'ascending' }); 

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

  // Función para obtener clase CSS para indicador de ordenamiento
  const getSortClass = (key) => {
    if (sortConfig.key !== key) return '';
    return sortConfig.direction === 'ascending' ? 'ascending' : 'descending';
  };

  // Función para obtener estado del usuario
  const getUserStatus = (user) => {
    const today = new Date();
    const expirationDate = new Date(user.fechaVencimiento);
    
    if (user.debe > 0) {
      return <span className="status-badge status-debt">Con Deuda</span>;
    }
    if (user.plan !== 'Tiquetera' && expirationDate < today) {
      return <span className="status-badge status-expired">Vencido</span>;
    }
    return <span className="status-badge status-active">Activo</span>;
  };

  return (
    <div className="users">
      <h2>Gestión de Usuarios</h2>

      {/* Campo de Búsqueda */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Buscar usuarios por nombre, teléfono, dirección o plan..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="add-user-section">
        <div className="action-buttons-row">
          <button
            className="btn btn-primary"
            onClick={() => setShowAddUserForm(!showAddUserForm)}
          >
            {showAddUserForm ? "Ocultar Formulario" : "Añadir Nuevo Usuario"}
          </button>
          <button
            className="btn btn-warning"
            onClick={() => {
              const maxAmount = prompt("Ingrese el monto máximo para limpiar deudas (ej: 1000 para deudas ≤ $1,000):", "1000");
              if (maxAmount && !isNaN(maxAmount) && parseFloat(maxAmount) >= 0) {
                if (window.confirm(`¿Está seguro de limpiar todas las deudas ≤ $${parseFloat(maxAmount).toLocaleString()}? Esta acción no se puede deshacer.`)) {
                  clearSmallDebts(parseFloat(maxAmount));
                }
              } else if (maxAmount !== null) {
                alert("Por favor ingrese un monto válido.");
              }
            }}
          >
            🧹 Limpiar Deudas Pequeñas
          </button>
        </div>
        {showAddUserForm && (
          <div className="add-user-form-container">
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

      <div className="users-table-container">
        <h3>Lista de Usuarios ({sortedUsers.length})</h3>
        <table className="table">
          <thead>
            <tr>
              <th 
                className={getSortClass('nombre')}
                onClick={() => requestSort('nombre')}
              >
                Nombre
              </th>
              <th 
                className={getSortClass('plan')}
                onClick={() => requestSort('plan')}
              >
                Plan
              </th>
              <th 
                className={getSortClass('fechaVencimiento')}
                onClick={() => requestSort('fechaVencimiento')}
              >
                Vencimiento
              </th>
              <th 
                className={getSortClass('debe')}
                onClick={() => requestSort('debe')}
              >
                Deuda
              </th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.nombre}</strong>
                  <div className="user-contact">
                    <small>{user.telefono}</small>
                  </div>
                </td>
                <td>{user.plan}</td>
                <td>
                  {user.fechaVencimiento && user.fechaVencimiento !== 'N/A (Tiquetera)' 
                    ? new Date(user.fechaVencimiento).toLocaleDateString()
                    : 'N/A (Tiquetera)'}
                </td>
                <td>
                  <span className={user.debe > 0 ? "debt-amount" : "no-debt"}>
                    ${user.debe.toLocaleString()}
                  </span>
                </td>
                <td>{getUserStatus(user)}</td>
                <td>
                  <div className="action-buttons">
                    <Link to={`/users/${user.id}`} className="btn btn-primary">
                      Ver Perfil
                    </Link>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDeleteUser(user.id, user.nombre)}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedUsers.length === 0 && (
          <div className="no-users">
            <p>No se encontraron usuarios. {searchTerm && "Intenta con otros términos de búsqueda."}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Users;
