import React, { createContext, useState, useEffect } from "react";
import { db } from '../firebaseConfig'; // <-- ¡Añadir esta línea!
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'; // <-- ¡Añadir esta línea!
import { auth } from '../firebaseConfig'; // <-- ¡Añadir esta línea!
import { onAuthStateChanged } from 'firebase/auth';
import { signOut } from "firebase/auth";

export const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  //const [payments, setPayments] = useState([]);
  const [bodyCompositions, setBodyCompositions] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [currentUser, setCurrentUser] = useState(null); // <-- ¡Añadir estado para el usuario autenticado!
  const [loading, setLoading] = useState(true);

    // Carga inicial de datos desde Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      const usersCollectionRef = collection(db, "users"); // Referencia a la colección "users"
      const usersSnapshot = await getDocs(usersCollectionRef); // Obtener todos los documentos
            const usersList = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        // Asegurarse de que el 'id' del objeto en el estado sea el ID del documento de Firestore
        // y eliminar el campo 'id' numérico si existe en los datos del documento
        const { id, ...rest } = data; // Desestructurar para separar el campo 'id' numérico
        return { id: doc.id, ...rest }; // Usar doc.id y el resto de los datos
      });

      setUsers(usersList);
    };

    const fetchBodyCompositions = async () => {
      const bodyCompositionsCollectionRef = collection(db, "bodyCompositions");
      const bodyCompositionsSnapshot = await getDocs(bodyCompositionsCollectionRef);
      const bodyCompositionsList = bodyCompositionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBodyCompositions(bodyCompositionsList);
    };

    const fetchAttendances = async () => {
      const attendancesCollectionRef = collection(db, "attendances");
      const attendancesSnapshot = await getDocs(attendancesCollectionRef);
      const attendancesList = attendancesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttendances(attendancesList);
    };

    fetchUsers();
    fetchBodyCompositions();
    fetchAttendances();
  }, []); // El array vacío asegura que se ejecute solo una vez al montar

  // --- NUEVO: useEffect para escuchar el estado de autenticación ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user); // user será el objeto de usuario si está autenticado, o null si no lo está
      setLoading(false); // Marcar la carga como completa una vez que sabemos si hay un usuario o no
    });

    // Limpiar el listener cuando el componente se desmonte
    return () => unsubscribe();
  }, []); // El array vacío asegura que se ejecute solo una vez

  /*
  useEffect(() => {
    localStorage.setItem("users", JSON.stringify(users));
  }, [users]);

  // useEffect for payments removed

  useEffect(() => {
    localStorage.setItem("bodyCompositions", JSON.stringify(bodyCompositions));
  }, [bodyCompositions]);

  useEffect(() => {
    localStorage.setItem("attendances", JSON.stringify(attendances));
  }, [attendances]);
  */

 // --- NUEVA FUNCIÓN: logout ---
 const logout = async () => {
   try {
     await signOut(auth);
     // El listener 'onAuthStateChanged' se encargará de actualizar currentUser a null
     console.log("Sesión cerrada exitosamente.");
   } catch (error) {
     console.error("Error al cerrar sesión:", error);
     alert("Error al cerrar sesión. Por favor, inténtalo de nuevo.");
   }
 };
 // --- FIN NUEVA FUNCIÓN ---

    const addUser = async (user) => {
    try {
      const userWithoutLocalId = { ...user };
      delete userWithoutLocalId.id;

      const docRef = await addDoc(collection(db, "users"), userWithoutLocalId);
      
      // ESTA ES LA LÍNEA CORRECTA
      // Combina el objeto original (sin el id numérico) con el nuevo id de Firestore
      const finalUserForState = { ...userWithoutLocalId, id: docRef.id };
      setUsers(prevUsers => [...prevUsers, finalUserForState]);

      console.log("Usuario añadido con ID: ", docRef.id);
    } catch (e) {
      console.error("Error al añadir usuario: ", e);
      alert("Error al añadir usuario. Por favor, inténtalo de nuevo.");
    }
  };


    const updateUser = async (updatedUser) => {
    try {
      // Crear una referencia al documento del usuario en Firestore usando su ID
      const userDocRef = doc(db, "users", String(updatedUser.id)); // <-- ¡Cambio aquí!

      
      // Actualizar el documento en Firestore.
      // El segundo argumento es el objeto con los campos a actualizar.
      // Firestore fusionará estos campos con los existentes.
      await updateDoc(userDocRef, updatedUser);
      
      // Actualizar el estado local de React
      setUsers(prevUsers => 
        prevUsers.map(user => (user.id === updatedUser.id ? updatedUser : user))
      );
      console.log("Usuario actualizado con ID: ", updatedUser.id);
    } catch (error) { // Cambiamos 'e' a 'error' para evitar confusiones
      console.error("Error al actualizar usuario:", error);
      // Puedes imprimir el error completo para más detalles
      console.error("Detalles del error:", error.code, error.message, error); 
      alert("Error al actualizar usuario. Por favor, inténtalo de nuevo.");
    }
  };


    const deleteUser = async (userId) => {
    try {
      // Crear una referencia al documento del usuario en Firestore
      const userDocRef = doc(db, "users", String(userId)); // <-- ¡Cambio aquí!

      
      // Eliminar el documento de Firestore
      await deleteDoc(userDocRef);
      
      // Actualizar el estado local de React
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      
      // Opcional: Eliminar composiciones corporales y asistencias asociadas a este usuario de Firestore
      // Esto requeriría consultas adicionales y bucles, lo haremos más adelante si es necesario
      // Por ahora, solo eliminamos del estado local para mantener la consistencia visual
      setBodyCompositions(prev => prev.filter(comp => comp.userId !== userId));
      setAttendances(prev => prev.filter(att => att.userId !== userId));

      console.log("Usuario eliminado con ID: ", userId);
    } catch (e) {
      console.error("Error al eliminar usuario: ", e);
      alert("Error al eliminar usuario. Por favor, inténtalo de nuevo.");
    }
  };


  // addPayment function removed

    const addBodyComposition = async (composition) => {
    try {
      // Añadir el documento a la colección "bodyCompositions" en Firestore
      const docRef = await addDoc(collection(db, "bodyCompositions"), composition);
      
      // Actualizar el estado local de React con el nuevo registro
      setBodyCompositions(prev => [...prev, { id: docRef.id, ...composition }]);
      console.log("Composición corporal añadida con ID: ", docRef.id);
      alert("Composición corporal guardada correctamente.");
    } catch (e) {
      console.error("Error al añadir composición corporal: ", e);
      alert("Error al añadir composición corporal. Por favor, inténtalo de nuevo.");
    }
  };

  const addAttendance = async (attendance) => {
    try {
      // Añadir el documento a la colección "attendances" en Firestore
      const docRef = await addDoc(collection(db, "attendances"), attendance);
      
      // Actualizar el estado local de React con el nuevo registro
      setAttendances(prev => [...prev, { id: docRef.id, ...attendance }]);
      console.log("Asistencia añadida con ID: ", docRef.id);
      alert("Asistencia registrada correctamente.");
    } catch (e) {
      console.error("Error al añadir asistencia: ", e);
      alert("Error al añadir asistencia. Por favor, inténtalo de nuevo.");
    }
  };



  return (
    <DataContext.Provider
      value={{
        currentUser,
        logout,
        users,
        setUsers,
        addUser,
        updateUser,
        deleteUser,
        // payments and addPayment removed
        bodyCompositions,
        setBodyCompositions,
        addBodyComposition,
        attendances,
        setAttendances,
        addAttendance,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
