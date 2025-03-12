const axios = require('axios');
const config = require('../config');

const getToken = async () => {
    const tenantId = config.TENANT_ID;
    const clientId = config.CLIENT_ID;
    const clientSecret = config.CLIENT_SECRET;

    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('scope', 'https://graph.microsoft.com/.default');

    try {
        console.log("📡 Enviando solicitud para obtener token...");
        

        const response = await axios.post(url, params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        let token = response.data.access_token.trim(); // 🔹 Eliminamos espacios en blanco o comillas accidentales
        return token;
    } catch (error) {
        console.error('❌ Error obteniendo el token:', error.response?.data || error);
        throw error;
    }
};

module.exports = { getToken };
