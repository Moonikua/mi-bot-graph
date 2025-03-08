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
        const response = await axios.post(url, params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        return response.data.access_token;
    } catch (error) {
        console.error('Error obteniendo el token:', error.response.data);
        throw error;
    }
};

module.exports = { getToken };
