const { graphRequest } = require('./graphClient');

const getManagedDevices = async () => {
    try {
        const data = await graphRequest('/deviceManagement/managedDevices');
        console.log('✅ Dispositivos gestionados obtenidos con éxito:');
        console.log(data);
        return data;
    } catch (error) {
        console.error('❌ Error obteniendo dispositivos gestionados:', error);
    }
};

module.exports = { getManagedDevices };
