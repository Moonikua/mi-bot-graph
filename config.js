require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Función para cargar archivos JSON de forma segura
const loadJSON = (filePath) => {
    const fullPath = path.join(__dirname, filePath);
    if (!fs.existsSync(fullPath)) {
        console.warn(`⚠️ No se pudo cargar ${filePath}. Verifica si el archivo existe.`);
        return {}; // Retorna un objeto vacío en caso de error
    }
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
};

module.exports = {
    // 🔹 Configuración de autenticación en Microsoft Graph
    TENANT_ID: process.env.TENANT_ID,
    CLIENT_ID: process.env.CLIENT_ID,
    CLIENT_SECRET: process.env.CLIENT_SECRET,

    // 🔹 Configuración SMTP
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    SMTP_PORT: Number(process.env.SMTP_PORT) || 587,
    SMTP_SECURE: process.env.SMTP_SECURE === 'true',
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,

    // 🔹 Configuración de correos
    EMAIL_SENDER: process.env.EMAIL_SENDER || 'tu_correo@gmail.com',
    EMAIL_RECIPIENT: process.env.EMAIL_RECIPIENT || 'destinatario@email.com',

    // 🔹 Configuración de tareas programadas (Cron Jobs)
    CRON_SCHEDULE: process.env.CRON_SCHEDULE || '0 */4 * * *',
    TIMEZONE: process.env.TIMEZONE || 'America/Santiago',

    // 🔹 Configuración de almacenamiento de archivos
    TEMP_DIR: process.env.TEMP_DIR || './temp',
    REPORT_FILENAME: process.env.REPORT_FILENAME || 'managed_devices_report.xlsx',

    // 🔹 Configuración del bot
    RUN_ON_STARTUP: process.env.RUN_ON_STARTUP === 'true',

    // 🔹 Configuración de Microsoft Graph API
    GRAPH_API_BASE_URL: 'https://graph.microsoft.com/beta',
    DEVICE_LIST: '/deviceManagement/managedDevices',
    GET_RAM: '$select=physicalMemoryInBytes',
    GET_APPS: '/detectedApps',
    
    // 🔹 Carga de archivos JSON de configuración
    WHITELIST: loadJSON('src/config/whitelist.json'),
    HARDWARE_REQUIREMENTS: loadJSON('src/config/hardwareRequirements.json'),
};
