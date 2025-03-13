const { graphRequest } = require('./graphClient');
const nodemailer = require('nodemailer');
const fs = require('fs');
const ExcelJS = require('exceljs');
const config = require('../config');
const path = require('path');

const getCurrentTimestamp = () => {
    return new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" }).replace(',', '');
};

const { WHITELIST, HARDWARE_REQUIREMENTS } = config;
const WHITE_LIST_APPS = new Set(WHITELIST.apps);

if (!fs.existsSync(config.TEMP_DIR)) {
    fs.mkdirSync(config.TEMP_DIR);
}


/** Obtiene la lista de dispositivos gestionados y procesa el estado de cumplimiento. */
const getManagedDevices = async (token) => {
    let complianceSummary = {};
    let deviceDetailsList = [];
    let deviceAppsList = [];

    try {
        console.log(`📡 Consultando dispositivos gestionados... (${getCurrentTimestamp()})`);
        const data = await graphRequest(config.DEVICE_LIST, token);
        console.log('✅ Dispositivos gestionados obtenidos con éxito');

        for (const device of data.value) {
            const userPrincipalName = device.userPrincipalName || 'Unknown User';
            const complianceState = device.complianceState || 'unknown';

            if (!complianceSummary[userPrincipalName]) {
                complianceSummary[userPrincipalName] = { compliant: 0, noncompliant: 0 };
            }
            complianceSummary[userPrincipalName][complianceState === 'compliant' ? 'compliant' : 'noncompliant'] += 1;
        }

        for (const device of data.value) {
            await getDeviceDetails(device.id, device.operatingSystem, token, deviceDetailsList, deviceAppsList);
        }

        return { complianceSummary, deviceDetailsList, deviceAppsList };
    } catch (error) {
        console.error(`❌ Error obteniendo dispositivos gestionados:`, error);
        return { complianceSummary, deviceDetailsList, deviceAppsList };
    }
};

/**
 * Obtiene detalles de un dispositivo y, si es iOS, obtiene sus aplicaciones y si es windows obtiene si RAM
 */
const getDeviceDetails = async (deviceId, operatingSystem, token, deviceDetailsList, deviceAppsList) => {
    try {
        const deviceData = await graphRequest(`${config.DEVICE_LIST}/${deviceId}`, token);
        const fullDeviceData = { ...deviceData };

        if (operatingSystem.toLowerCase() === 'windows') {
            try {
                const memoryData = await graphRequest(`${config.DEVICE_LIST}/${deviceId}?${config.GET_RAM}`, token);
                fullDeviceData.physicalMemoryInBytes = memoryData.physicalMemoryInBytes || 0;
            } catch (error) {
                console.error(`⚠️ No se pudo obtener physicalMemoryInBytes para ${deviceId}:`, error);
                fullDeviceData.physicalMemoryInBytes = 0;
            }
        } else {
            fullDeviceData.physicalMemoryInBytes = "N/A";
        }

        deviceDetailsList.push(fullDeviceData);

        if (operatingSystem.toLowerCase() === 'ios') {
            const apps = await getDeviceApps(deviceId, token);
            if (apps) {
                deviceAppsList.push({ deviceId, apps });
            }
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
            const appsData = await graphRequest(`${config.DEVICE_LIST}/${deviceId}${config.GET_APPS}`, token);
            return appsData.value.filter(app => !WHITE_LIST_APPS.has(app.displayName));
        } catch (error) {
            if (error.response?.status === 429) {
                const retryAfter = error.response.headers['retry-after'] || 10;
                console.warn(`⚠️ Rate Limit Exceeded (429). Retrying in ${retryAfter} seconds...`);
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            } else {
                console.error(`❌ Error obteniendo aplicaciones para ${deviceId}:`, error);
                return null;
            }
        }
    }
    return null;
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


const sendEmailWithAttachment = async (complianceSummary, deviceDetailsList, deviceAppsList, recipientEmail = config.EMAIL_RECIPIENT) => {
    try {
        console.log(`📡 Generando el reporte antes de enviar el email...`);

        // 🔹 Generar el reporte con los datos ya obtenidos en `runBot()`
        const filePath = await generateExcelReport(complianceSummary, deviceDetailsList, deviceAppsList);
        if (!filePath) throw new Error('❌ No se pudo generar el reporte.');

        // 📧 Configuración del correo
        let transporter = nodemailer.createTransport({
            host: config.SMTP_HOST,
            port: config.SMTP_PORT,
            secure: config.SMTP_SECURE,
            auth: { user: config.SMTP_USER, pass: config.SMTP_PASSWORD }
        });

        let mailOptions = {
            from: config.EMAIL_SENDER,
            to: recipientEmail,
            subject: '📊 Reporte de Dispositivos Gestionados',
            text: 'Adjunto encontrarás el reporte en formato Excel.',
            attachments: [{ filename: path.basename(filePath), path: filePath }]
        };

        await transporter.sendMail(mailOptions);
        console.log(`📧 Email enviado a ${recipientEmail}`);

        await fs.unlink(filePath);
        console.log(`🗑️ Archivo eliminado: ${filePath}`);
    } catch (error) {
        console.error('❌ Error enviando el correo:', error);
    }
};




module.exports = { getManagedDevices, sendEmailWithAttachment };

