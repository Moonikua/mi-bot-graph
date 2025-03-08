const { getManagedDevices, generateExcelReport, sendEmailWithAttachment } = require('./deviceManager');
const { getToken } = require('./auth');
const cron = require('cron').CronJob;

const getCurrentTimestamp = () => {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
};

const runBot = async () => {
    try {
        console.log("🚀 Iniciando el BOT de gestión de dispositivos...");
        console.log(`🕒 Inicio del bot: ${getCurrentTimestamp()}`);

        // Obtener el token de autenticación
        const token = await getToken();
        if (!token) {
            throw new Error("❌ No se pudo obtener el token de autenticación.");
        }

        console.log("🔑 Token obtenido con éxito.");

        // Obtener dispositivos y procesar datos
        await getManagedDevices(token);

        // Generar el archivo Excel
        const filePath = await generateExcelReport();

        // Enviar el archivo por correo (Reemplaza con el correo destinatario)
        await sendEmailWithAttachment('destinatario@email.com');
        
        console.log(`🕒 Termino del bot: ${getCurrentTimestamp()}`);
        console.log("✅ Proceso completado exitosamente.");
    } catch (error) {
        console.error('❌ Error en la ejecución:', error);
    }
};
// Ejecutar el bot inmediatamente al iniciar
runBot();

// Configuración de cron para ejecutar revisar config
// const config = require('./config');

// new cron(
//     config.CRON_SCHEDULE,
//     async () => {
//         await runBot();
//     },
//     null, true, config.TIMEZONE
// ).start();
