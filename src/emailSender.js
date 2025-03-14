const nodemailer = require('nodemailer');
const { generateExcelReport } = require('./generateExcelReport');
const fs = require('fs');
const config = require('../config');
const path = require('path');

const sendEmailWithAttachment = async (complianceSummary, deviceDetailsList, deviceAppsList, recipientEmail = config.EMAIL_RECIPIENT) => {
    try {
        console.log(`📡 Generando el reporte antes de enviar el email...`);

        // 🔹 Generar el reporte con los datos ya obtenidos en `runBot()`
        const filePath = await generateExcelReport(complianceSummary, deviceDetailsList, deviceAppsList);
        if (!filePath) throw new Error('❌ No se pudo generar el reporte.');

        // 📧 Configuración del correo
        let transporter = nodemailer.createTransport({
            host: config.SMTP_HOST,
            port: config.SMTP_PORT,
            secure: config.SMTP_SECURE,
            auth: { user: config.SMTP_USER, pass: config.SMTP_PASSWORD }
        });

        let mailOptions = {
            from: config.EMAIL_SENDER,
            to: recipientEmail,
            subject: '📊 Reporte de Dispositivos Gestionados',
            text: 'Adjunto encontrarás el reporte en formato Excel.',
            attachments: [{ filename: path.basename(filePath), path: filePath }]
        };

        await transporter.sendMail(mailOptions);
        console.log(`📧 Email enviado a ${recipientEmail}`);

        await fs.unlink(filePath);
        console.log(`🗑️ Archivo eliminado: ${filePath}`);
    } catch (error) {
        console.error('❌ Error enviando el correo:', error);
    }
};

export {sendEmailWithAttachment}