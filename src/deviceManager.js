const { graphRequest } = require('./graphClient');
const nodemailer = require('nodemailer');
const fs = require('fs');
const ExcelJS = require('exceljs');
const config = require('../config');
const path = require('path');

const complianceSummary = {};
const deviceDetailsList = [];
const deviceAppsList = [];

// Obtener la fecha y hora actual para el log
const getCurrentTimestamp = () => {
    return new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" }).replace(',', '');
};

if (!fs.existsSync(config.TEMP_DIR)) {
    fs.mkdirSync(config.TEMP_DIR);
}
//Obtiene el whiteList para poder filtrar las apps
const whitelist = JSON.parse(fs.readFileSync(path.join(__dirname, 'config/whitelist.json'), 'utf8'));
//Obtiene los requerimientos por Modelo
const hardwareRequirements = JSON.parse(fs.readFileSync(path.join(__dirname, 'config/hardwareRequirements.json'), 'utf8'));

const WHITE_LIST_APPS = new Set(whitelist.apps);

// Almacenar resultados en memoria

/** Obtiene la lista de dispositivos gestionados y procesa el estado de cumplimiento. */
const getManagedDevices = async (token) => {
    try {
        console.log(`📡 Consultando dispositivos gestionados... (${getCurrentTimestamp()})`);
        const data = await graphRequest('/deviceManagement/managedDevices', token);
        console.log('✅ Dispositivos gestionados obtenidos con éxito:');
        
        const devices = data.value;

        for (const device of devices) {
            const userPrincipalName = device.userPrincipalName || 'Unknown User';
            const complianceState = device.complianceState || 'unknown';
            
            if (!complianceSummary[userPrincipalName]) {
                complianceSummary[userPrincipalName] = { compliant: 0, noncompliant: 0 };
            }
            
            if (complianceState === 'compliant') {
                complianceSummary[userPrincipalName].compliant += 1;
            } else if (complianceState === 'noncompliant') {
                complianceSummary[userPrincipalName].noncompliant += 1;
            }
        }
                
        // Iterar sobre los dispositivos para obtener más información
        for (const device of devices) {
            await getDeviceDetails(device.id, device.operatingSystem, token);
        }
        
        return { complianceSummary, deviceDetailsList, deviceAppsList };
    } catch (error) {
        console.error(`❌ Error obteniendo dispositivos gestionados (${getCurrentTimestamp()}):`, error);
    }
 };


/**
 * Obtiene detalles de un dispositivo y, si es iOS, obtiene sus aplicaciones y si es windows obtiene si RAM
 */
const getDeviceDetails = async (deviceId, operatingSystem,token) => {
    try {
        // Primera petición: Obtener detalles generales del dispositivo
        const deviceData = await graphRequest(`/deviceManagement/managedDevices/${deviceId}`,token);

        // Inicializar datos del dispositivo con lo que ya tenemos
        const fullDeviceData = { ...deviceData };

        // Si el dispositivo es Windows, hacer la segunda petición para `physicalMemoryInBytes`
        if (operatingSystem.toLowerCase() === 'windows') {
            try {
                const memoryData = await graphRequest(`/deviceManagement/managedDevices/${deviceId}?$select=physicalMemoryInBytes`,token);
                fullDeviceData.physicalMemoryInBytes = memoryData.physicalMemoryInBytes || 0; 
            } catch (error) {
                console.error(`⚠️ No se pudo obtener physicalMemoryInBytes para ${deviceId}:`, error);
                fullDeviceData.physicalMemoryInBytes = 0; // Si falla, poner 0
            }
        } else {
            fullDeviceData.physicalMemoryInBytes = "N/A"; // Si no es Windows, marcarlo como N/A
        }


        // Guardar detalles en la lista
        deviceDetailsList.push(fullDeviceData);

        // Si el dispositivo es iOS, obtener aplicaciones
        if (operatingSystem.toLowerCase() === 'ios') {
            await getDeviceApps(deviceId,token);
        }
    } catch (error) {
        console.error(`❌ Error obteniendo detalles del dispositivo ${deviceId}:`, error);
    }
};

/**
 * Obtiene las aplicaciones instaladas en un dispositivo iOS.
 */
const getDeviceApps = async (deviceId, token, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const appsData = await graphRequest(`/deviceManagement/managedDevices/${deviceId}/detectedApps`, token);
            
            // Filtrar las apps que NO están en la lista blanca
            const filteredApps = appsData.value.filter(app => !WHITE_LIST_APPS.has(app.displayName));

            // Guardar solo las apps relevantes
            deviceAppsList.push({ deviceId, apps: filteredApps });
            return; // ✅ Salir de la función si la solicitud fue exitosa

        } catch (error) {
            if (error.response && error.response.status === 429) {
                const retryAfter = error.response.headers['retry-after'] || 10; // Si no hay Retry-After, espera 10s
                console.warn(`⚠️ Demasiadas solicitudes (429). Esperando ${retryAfter} segundos antes de reintentar...`);
                
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000)); // 🕒 Esperar el tiempo indicado
            } else {
                console.error(`❌ Error obteniendo aplicaciones del dispositivo ${deviceId}:`, error);
                return; // ❌ Si el error no es 429, salir de la función
            }
        }
    }
};

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
const generateExcelReport = async () => {
    try {
        const workbook = new ExcelJS.Workbook();
        
        // Generar timestamp para el nombre del archivo
        const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
        const filePath = `${config.TEMP_DIR}/${config.REPORT_FILENAME.replace('.xlsx', '')}_${timestamp}.xlsx`;

        // Crear hojas
        const complianceSheet = workbook.addWorksheet('Compliance Summary');
        const devicesSheet = workbook.addWorksheet('Device Details with Apps');

        // ➤ Agregar datos a "Compliance Summary"
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

        // ➤ Función para convertir bytes a GB o MB
        const formatBytes = (bytes) => {
            if (typeof bytes === "string") return bytes; // Si es "N/A", devolver tal cual
            if (bytes >= 1e9) return Math.floor(bytes / 1e9) + ' GB'; // ✅ Solo parte entera en GB
            if (bytes >= 1e6) return Math.floor(bytes / 1e6) + ' MB'; // ✅ Solo parte entera en MB
            return bytes + ' Bytes';
        };

        // ➤ Agregar datos a "Device Details with Apps"
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
            const { ramAlert, storageAlert } = validateHardware(device);

            // Generar mensaje de alerta
            let alertMessage = "";
            if (ramAlert) alertMessage += "Low RAM ";
            if (storageAlert) alertMessage += "Low Storage";

            // Agregar fila
            let row = devicesSheet.addRow({
                id: device.id,
                userPrincipalName: device.userPrincipalName,
                operatingSystem: device.operatingSystem,
                complianceState: device.complianceState,
                totalStorage: formatBytes(device.totalStorageSpaceInBytes),
                freeStorage: formatBytes(device.freeStorageSpaceInBytes),
                physicalMemory: formatBytes(device.physicalMemoryInBytes),
                hardwareAlert: alertMessage || "OK",
                apps: deviceAppsList.find(d => d.deviceId === device.id)?.apps.map(app => app.displayName).join(", ") || "N/A"
            });

            // ➤ Resaltar celdas según condiciones
            if (device.complianceState.toLowerCase() === 'noncompliant') {
                row.getCell('complianceState').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0000' } }; // 🔴 Rojo intenso
            }
            if (ramAlert || storageAlert) {
                row.getCell('hardwareAlert').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } }; // 🟡 Amarillo para alertas
            }
        });

        // ➤ Guardar archivo
        await workbook.xlsx.writeFile(filePath);
        console.log(`✅ Archivo Excel generado: ${filePath}`);
        return filePath;
    } catch (error) {
        console.error('❌ Error generando el archivo Excel:', error);
    }
};





const sendEmailWithAttachment = async (recipientEmail = config.EMAIL_RECIPIENT) => {
    try {
        const filePath = await generateExcelReport();

        // Configuración del transporte SMTP
        let transporter = nodemailer.createTransport({
            host: config.SMTP_HOST,
            port: config.SMTP_PORT,
            secure: config.SMTP_SECURE, // true para 465, false para otros
            auth: {
                user: config.SMTP_USER,
                pass: config.SMTP_PASSWORD
            }
        });

        let mailOptions = {
            from: config.EMAIL_SENDER,
            to: recipientEmail,
            subject: '📊 Reporte de Dispositivos Gestionados',
            text: 'Adjunto encontrarás el reporte en formato Excel.',
            attachments: [
                { filename: config.REPORT_FILENAME, path: filePath }
            ]
        };

        let info = await transporter.sendMail(mailOptions);
        console.log(`📧 Email enviado con éxito a ${recipientEmail}:`, info.response);

        // Eliminar el archivo después del envío
        fs.unlinkSync(filePath);
        console.log(`🗑️ Archivo eliminado: ${filePath}`);
    } catch (error) {
        console.error('❌ Error enviando el correo:', error);
    }
};


module.exports = { getManagedDevices, generateExcelReport, sendEmailWithAttachment, complianceSummary, deviceDetailsList, deviceAppsList };
