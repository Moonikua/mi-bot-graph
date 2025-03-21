const ExcelJS = require('exceljs');
const config = require('../config');


// Función para validar si el hardware cumple con los requisitos
const validateHardware = (device) => {
    if (!device || !device.operatingSystem) return { ramAlert: false, storageAlert: false, alertText: "" };

    let ramAlert = false;
    let storageAlert = false;
    let alertText = "";

    // Reglas para Windows (Ejemplo: Mínimo 8GB de RAM y 256GB de almacenamiento total)
    if (device.operatingSystem.toLowerCase() === 'windows') {
        const minRAM = 8 * 1e9; // 8GB en bytes
        const minStorage = 256 * 1e9; // 256GB en bytes

        if (device.physicalMemoryInBytes < minRAM) {
            ramAlert = true;
            alertText += `RAM insuficiente (${(device.physicalMemoryInBytes / 1e9).toFixed(1)}GB) `;
        }
        if (device.totalStorageSpaceInBytes < minStorage) {
            storageAlert = true;
            alertText += `Almacenamiento insuficiente (${(device.totalStorageSpaceInBytes / 1e9).toFixed(1)}GB) `;
        }
    }

    return { ramAlert, storageAlert, alertText: alertText.trim() || "OK" };
};


/**
 * Genera y guarda un archivo Excel con la información procesada.
 */
const generateExcelReport = async (complianceSummary, deviceDetailsList, deviceAppsList) => {
    try {
        const workbook = new ExcelJS.Workbook();

        // 🔹 Generar timestamp para el nombre del archivo
        const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
        const filePath = `${config.TEMP_DIR}/${config.REPORT_FILENAME.replace('.xlsx', '')}_${timestamp}.xlsx`;

        // 🔹 Crear hojas en el archivo Excel
        const complianceSheet = workbook.addWorksheet('Compliance Summary');
        const devicesSheet = workbook.addWorksheet('Device Details with Apps');

        // 📌 Agregar datos a "Compliance Summary"
        complianceSheet.columns = [
            { header: 'UserPrincipalName', key: 'userPrincipalName', width: 30 },
            { header: 'Compliant Devices', key: 'compliant', width: 20 },
            { header: 'Noncompliant Devices', key: 'noncompliant', width: 20 }
        ];

        Object.entries(complianceSummary).forEach(([user, stats]) => {
            complianceSheet.addRow({
                userPrincipalName: user,
                compliant: stats.compliant,
                noncompliant: stats.noncompliant
            });
        });

        // 📌 Función para convertir bytes a GB o MB
        const formatBytes = (bytes) => {
            if (typeof bytes === "string") return bytes;
            if (bytes >= 1e9) return Math.floor(bytes / 1e9) + ' GB';
            if (bytes >= 1e6) return Math.floor(bytes / 1e6) + ' MB';
            return bytes + ' Bytes';
        };

        // 📌 Agregar datos a "Device Details with Apps"
        devicesSheet.columns = [
            { header: 'Device ID', key: 'id', width: 20 },
            { header: 'UserPrincipalName', key: 'userPrincipalName', width: 30 },
            { header: 'Operating System', key: 'operatingSystem', width: 20 },
            { header: 'Compliance State', key: 'complianceState', width: 20 },
            { header: 'Total Storage', key: 'totalStorage', width: 20 },
            { header: 'Free Storage', key: 'freeStorage', width: 20 },
            { header: 'Physical Memory', key: 'physicalMemory', width: 20 },
            { header: 'Hardware Alert', key: 'hardwareAlert', width: 20 },
            { header: 'Installed Apps', key: 'apps', width: 50 }
        ];

        deviceDetailsList.forEach(device => {
            const { ramAlert, storageAlert, alertText } = validateHardware(device);

            let row = devicesSheet.addRow({
                id: device.id,
                userPrincipalName: device.userPrincipalName,
                operatingSystem: device.operatingSystem,
                complianceState: device.complianceState,
                totalStorage: formatBytes(device.totalStorageSpaceInBytes),
                freeStorage: formatBytes(device.freeStorageSpaceInBytes),
                physicalMemory: formatBytes(device.physicalMemoryInBytes),
                hardwareAlert: alertText,
                apps: deviceAppsList.find(d => d.deviceId === device.id)?.apps.map(app => app.displayName).join(", ") || "N/A"
            });

            if (device.complianceState.toLowerCase() === 'noncompliant') {
                row.getCell('complianceState').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0000' } };
            }
            if (ramAlert || storageAlert) {
                row.getCell('hardwareAlert').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } };
            }
        });

        // 📌 Guardar archivo
        await workbook.xlsx.writeFile(filePath);
        console.log(`✅ Archivo Excel generado: ${filePath}`);
        return filePath;
    } catch (error) {
        console.error('❌ Error generando el archivo Excel:', error);
    }
};

module.exports = {generateExcelReport};