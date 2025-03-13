const { getManagedDevices, sendEmailWithAttachment } = require('./deviceManager');
const { getToken } = require('./auth');
const cron = require('cron').CronJob;
const config = require('../config');

const getCurrentTimestamp = () => {
    return new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" }).replace(',', '');
};

const runBot = async () => {
    try {
        console.log("🚀 Iniciando el BOT de gestión de dispositivos...");
        console.log(`🕒 Inicio del bot: ${getCurrentTimestamp()}`);

        // 🔑 Obtener el token de autenticación
        const token = await getToken();
        if (!token) {
            throw new Error("❌ No se pudo obtener el token de autenticación.");
        }

        console.log("🔑 Token obtenido con éxito.");

        // 📡 Obtener dispositivos y procesar datos
        const { complianceSummary, deviceDetailsList, deviceAppsList } = await getManagedDevices(token);

        // 📧 Enviar el archivo por correo con los datos ya obtenidos
        await sendEmailWithAttachment(complianceSummary, deviceDetailsList, deviceAppsList);

        console.log(`🕒 Termino del bot: ${getCurrentTimestamp()}`);
        console.log("✅ Proceso completado exitosamente.");
    } catch (error) {
        console.error('❌ Error en la ejecución:', error);
    }
};

// ✅ Ejecutar el bot inmediatamente si está habilitado en config
if (config.RUN_ON_STARTUP) {
    runBot();
}

// ✅ Configurar cron job solo si `CRON_SCHEDULE` está definido en config
if (config.CRON_SCHEDULE) {
    new cron(
        config.CRON_SCHEDULE,
        async () => {
            await runBot();
        },
        null,
        true,
        config.TIMEZONE || "America/Santiago"
    ).start();

    console.log(`⏳ Cron job configurado para ejecutarse con la expresión: "${config.CRON_SCHEDULE}" en zona horaria: "${config.TIMEZONE || "America/Santiago"}"`);
}
