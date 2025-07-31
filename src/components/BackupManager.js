/* src/components/BackupManager.js */
import React, { useContext } from 'react';
import { DataContext } from '../contexts/DataContext';
import './BackupManager.css';

const BackupManager = () => {
  const { users, bodyCompositions, attendances, setUsers, setBodyCompositions, setAttendances } = useContext(DataContext);

  const handleExport = () => {
    const allData = {
      users,
      //payments,
      bodyCompositions,
      attendances,
      exportDate: new Date().toISOString(),
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(allData, null, 2)
    )}`;
    
    const link = document.createElement("a");
    link.href = jsonString;
    const date = new Date().toISOString().split('T')[0];
    link.download = `zeus-gym-backup-${date}.json`;

    link.click();
  };

  const handleImport = (event) => {
    const fileReader = new FileReader();
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    fileReader.readAsText(file, "UTF-8");
    fileReader.onload = e => {
      try {
        const importedData = JSON.parse(e.target.result);
        

        // --- INICIO DE CAMBIOS: Añadir console.log para depuración ---
        console.log("Datos importados (importedData):", importedData);
        console.log("Usuarios importados (importedData.users):", importedData.users);
        console.log("Composiciones corporales importadas (importedData.bodyCompositions):", importedData.bodyCompositions);
        console.log("Asistencias importadas (importedData.attendances):", importedData.attendances);
        // --- FIN DE CAMBIOS ---

        // Validación básica para asegurar que el archivo es correcto
        if (importedData.users && importedData.bodyCompositions && importedData.attendances) {
          const isConfirmed = window.confirm(
            "¿Estás seguro de que quieres restaurar los datos? Esto sobreescribirá toda la información actual."
          );
          if (isConfirmed) {
            setUsers(importedData.users);
            //setPayments(importedData.payments);
            setBodyCompositions(importedData.bodyCompositions);
            setAttendances(importedData.attendances);
            alert("¡Datos restaurados con éxito!");
          }
        } else {
          alert("El archivo de copia de seguridad parece estar corrupto o no tiene el formato correcto.");
        }
      } catch (error) {
        alert("Error al leer el archivo. Asegúrate de que sea un archivo de copia de seguridad válido.");
        console.error("Error al importar:", error);
      }
    };
  };

  return (
    <div className="backup-panel">
      <h3>Copias de Seguridad</h3>
      <p>Exporta todos tus datos a un archivo seguro o restaura desde una copia anterior.</p>
      <div className="backup-actions">
        <button onClick={handleExport} className="export-button">
          Exportar Datos
        </button>
        <label htmlFor="import-button" className="import-label">
          Importar Datos
        </label>
        <input
          type="file"
          id="import-button"
          accept=".json"
          onChange={handleImport}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
};

export default BackupManager;
