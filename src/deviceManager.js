const { graphRequest } = require('./graphClient');
const nodemailer = require('nodemailer');
const fs = require('fs');
const ExcelJS = require('exceljs');

// Almacenar resultados en memoria
const complianceSummary = {};
const deviceDetailsList = [];
const deviceAppsList = [];

/**
 * Obtiene la lista de dispositivos gestionados y procesa el estado de cumplimiento.
 */
const getManagedDevices = async (token) => {
    try {
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
        console.error('❌ Error obteniendo dispositivos gestionados:', error);
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
const generateExcelReport = async (filePath = 'managed_devices_report.xlsx') => {
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

/**
 * Envía el archivo Excel generado por correo electrónico.
 */
const sendEmailWithAttachment = async (recipientEmail) => {
    try {
        const filePath = await generateExcelReport();
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'tu_correo@gmail.com', // Reemplazar con el correo emisor
                pass: 'tu_contraseña' // Reemplazar con la contraseña o app password
            }
        });

        let mailOptions = {
            from: 'tu_correo@gmail.com',
            to: recipientEmail,
            subject: 'Reporte de Dispositivos Gestionados',
            text: 'Adjunto encontrarás el reporte en formato Excel.',
            attachments: [
                {
                    filename: 'managed_devices_report.xlsx',
                    path: filePath
                }
            ]
        };

        let info = await transporter.sendMail(mailOptions);
        console.log('📧 Email enviado:', info.response);
    } catch (error) {
        console.error('❌ Error enviando el correo:', error);
    }
};

module.exports = { getManagedDevices, generateExcelReport, sendEmailWithAttachment, complianceSummary, deviceDetailsList, deviceAppsList };
