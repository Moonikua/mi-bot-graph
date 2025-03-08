require('dotenv').config();

module.exports = {
    // Configuración de autenticación
    TENANT_ID: process.env.TENANT_ID,
    CLIENT_ID: process.env.CLIENT_ID,
    CLIENT_SECRET: process.env.CLIENT_SECRET,

    // Configuración SMTP
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
    SMTP_PORT: process.env.SMTP_PORT || 587,
    SMTP_SECURE: process.env.SMTP_SECURE === 'true', // `true` para 465, `false` para 587
    SMTP_USER: process.env.SMTP_USER, // Usuario SMTP
    SMTP_PASSWORD: process.env.SMTP_PASSWORD, // Contraseña o App Password

    // Configuración de envío de correos
    EMAIL_SENDER: process.env.EMAIL_SENDER || 'tu_correo@gmail.com',
    EMAIL_RECIPIENT: process.env.EMAIL_RECIPIENT || 'destinatario@email.com',

    // Configuración cron
    CRON_SCHEDULE: process.env.CRON_SCHEDULE || '30 */4 * * *',
    TIMEZONE: process.env.TIMEZONE || 'America/Santiago',

    // Configuración de almacenamiento de archivos
    TEMP_DIR: process.env.TEMP_DIR || './temp',
    REPORT_FILENAME: process.env.REPORT_FILENAME || 'managed_devices_report.xlsx'
};
