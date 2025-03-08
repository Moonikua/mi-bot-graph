const { graphRequest } = require('./graphClient');
const nodemailer = require('nodemailer');
const fs = require('fs');
const ExcelJS = require('exceljs');
const config = require('../config');

const complianceSummary = {};
const deviceDetailsList = [];
const deviceAppsList = [];

// Obtener la fecha y hora actual para el log
const getCurrentTimestamp = () => {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
};

console.log(`🕒 Inicio del bot: ${getCurrentTimestamp()}`);
if (!fs.existsSync(config.TEMP_DIR)) {
    fs.mkdirSync(config.TEMP_DIR);
}

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
        
        console.log("📊 Resumen de Compliance por Usuario:", complianceSummary);
        console.log("📥 Dispositivos obtenidos, iniciando consulta de detalles...");
        
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
 * Obtiene detalles de un dispositivo y, si es iOS, obtiene sus aplicaciones.
 */
const getDeviceDetails = async (deviceId, operatingSystem, token) => {
    try {
        const deviceData = await graphRequest(`/deviceManagement/managedDevices/${deviceId}`, token);
        console.log(`📌 Información del dispositivo ${deviceId}:`, deviceData);
        
        // Guardar detalles en lista
        deviceDetailsList.push(deviceData);

        // Si el dispositivo es iOS, obtener aplicaciones
        if (operatingSystem.toLowerCase() === 'ios') {
            await getDeviceApps(deviceId, token);
        }
    } catch (error) {
        console.error(`❌ Error obteniendo detalles del dispositivo ${deviceId}:`, error);
    }
};

/**
 * Obtiene las aplicaciones instaladas en un dispositivo iOS.
 */
const getDeviceApps = async (deviceId, token) => {
    try {
        const appsData = await graphRequest(`/deviceManagement/managedDevices/${deviceId}/detectedApps`, token);
        console.log(`📱 Aplicaciones detectadas en iOS (${deviceId}):`, appsData.value);
        
        // Guardar datos en lista
        deviceAppsList.push({ deviceId, apps: appsData.value });
    } catch (error) {
        console.error(`❌ Error obteniendo aplicaciones del dispositivo ${deviceId}:`, error);
    }
};

/**
 * Genera y guarda un archivo Excel con la información procesada.
 */
const generateExcelReport = async (filePath = `${config.TEMP_DIR}/${config.REPORT_FILENAME}`) => {
    try {
        const workbook = new ExcelJS.Workbook();

        // Crear hojas
        const complianceSheet = workbook.addWorksheet('Compliance Summary');
        const devicesSheet = workbook.addWorksheet('Device Details with Apps');

        // Agregar datos a "Compliance Summary"
        complianceSheet.columns = [
            { header: 'UserPrincipalName', key: 'userPrincipalName', width: 30 },
            { header: 'Compliant Devices', key: 'compliant', width: 20 },
            { header: 'Noncompliant Devices', key: 'noncompliant', width: 20 }
        ];
        Object.entries(complianceSummary).forEach(([user, stats]) => {
            complianceSheet.addRow({ userPrincipalName: user, compliant: stats.compliant, noncompliant: stats.noncompliant });
        });

        // Agregar datos a "Device Details with Apps"
        devicesSheet.columns = [
            { header: 'Device ID', key: 'id', width: 20 },
            { header: 'UserPrincipalName', key: 'userPrincipalName', width: 30 },
            { header: 'Operating System', key: 'operatingSystem', width: 20 },
            { header: 'Compliance State', key: 'complianceState', width: 20 },
            { header: 'Installed Apps', key: 'apps', width: 50 }
        ];
        deviceDetailsList.forEach(device => {
            devicesSheet.addRow({
                id: device.id,
                userPrincipalName: device.userPrincipalName,
                operatingSystem: device.operatingSystem,
                complianceState: device.complianceState,
                apps: deviceAppsList.find(d => d.deviceId === device.id)?.apps.map(app => app.displayName).join(", ") || "N/A"
            });
        });

        // Guardar archivo
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
