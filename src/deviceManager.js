const { graphRequest } = require('./graphClient');

// Almacenar resultados en memoria
const complianceSummary = {};
const deviceDetailsList = [];
const deviceAppsList = [];

/**
 * Obtiene la lista de dispositivos gestionados y procesa el estado de cumplimiento.
 */
const getManagedDevices = async () => {
    try {
        const data = await graphRequest('/deviceManagement/managedDevices');
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
            await getDeviceDetails(device.id, device.operatingSystem);
        }
        
        return { complianceSummary, deviceDetailsList, deviceAppsList };
    } catch (error) {
        console.error('❌ Error obteniendo dispositivos gestionados:', error);
    }
};

/**
 * Obtiene detalles de un dispositivo y, si es iOS, obtiene sus aplicaciones.
 */
const getDeviceDetails = async (deviceId, operatingSystem) => {
    try {
        const deviceData = await graphRequest(`/deviceManagement/managedDevices/${deviceId}`);
        console.log(`📌 Información del dispositivo ${deviceId}:`, deviceData);
        
        // Guardar detalles en lista
        deviceDetailsList.push(deviceData);

        // Si el dispositivo es iOS, obtener aplicaciones
        if (operatingSystem.toLowerCase() === 'ios') {
            await getDeviceApps(deviceId);
        }
    } catch (error) {
        console.error(`❌ Error obteniendo detalles del dispositivo ${deviceId}:`, error);
    }
};

/**
 * Obtiene las aplicaciones instaladas en un dispositivo iOS.
 */
const getDeviceApps = async (deviceId) => {
    try {
        const appsData = await graphRequest(`/deviceManagement/managedDevices/${deviceId}/detectedApps`);
        console.log(`📱 Aplicaciones detectadas en iOS (${deviceId}):`, appsData.value);
        
        // Guardar datos en lista
        deviceAppsList.push({ deviceId, apps: appsData.value });
    } catch (error) {
        console.error(`❌ Error obteniendo aplicaciones del dispositivo ${deviceId}:`, error);
    }
};

module.exports = { getManagedDevices, complianceSummary, deviceDetailsList, deviceAppsList };