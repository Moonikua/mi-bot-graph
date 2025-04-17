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
            fullDeviceData.physicalMemoryInBytes = await getPhysicalMemorySafely(deviceId, token);
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

const getPhysicalMemorySafely = async (deviceId, token) => {
    try {
        const response = await graphRequest(`${config.DEVICE_LIST}/${deviceId}?${config.GET_RAM}`, token);
        return response.physicalMemoryInBytes || 0;
    } catch (err) {
        console.warn(`⚠️ No se pudo obtener physicalMemoryInBytes para ${deviceId}:`, err.response?.status || err.message);
        return 0;
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


module.exports = { getManagedDevices };

