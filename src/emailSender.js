const nodemailer = require('nodemailer');
const { generateExcelReport } = require('./generateExcelReport');
const fs = require('fs');
const config = require('../config');
const path = require('path');

const sendEmailWithAttachment = async (complianceSummary, deviceDetailsList, deviceAppsList, recipientEmail = config.EMAIL_RECIPIENT) => {
    try {
        console.log(`📡 Generando el reporte antes de enviar el email...`);
        const filePath = await generateExcelReport(complianceSummary, deviceDetailsList, deviceAppsList);
        if (!filePath) throw new Error('❌ No se pudo generar el reporte.');

        const transporter = nodemailer.createTransport({
            host: config.SMTP_HOST,
            port: parseInt(config.SMTP_PORT),
            secure: config.SMTP_SECURE === 'true',
            auth: {
                user: config.SMTP_USER,
                pass: config.SMTP_PASSWORD
            }
        });

        await transporter.verify();
        console.log("✅ Conexión SMTP válida.");

        const mailOptions = {
            from: config.EMAIL_SENDER,
            to: recipientEmail,
            subject: '📊 Reporte de Dispositivos Gestionados',
            text: 'Adjunto encontrarás el reporte en formato Excel.',
            attachments: [
                {
                    filename: path.basename(filePath),
                    path: filePath
                }
            ]
        };

        await transporter.sendMail(mailOptions);
        console.log(`📧 Email enviado a ${recipientEmail}`);

        await fs.unlink(filePath);
        console.log(`🗑️ Archivo eliminado: ${filePath}`);
    } catch (error) {
        console.error('❌ Error enviando el correo:', error);
    }
};

module.exports =  { sendEmailWithAttachment };