# 🤖 MCI-BOT

## 📌 Descripción
MCI-BOT es una herramienta automatizada desarrollada en Node.js que se conecta a Microsoft Graph API para consultar dispositivos gestionados en Intune, generar reportes en formato Excel, y enviarlos automáticamente por correo electrónico a destinatarios definidos.

---

## ⚙️ Instalación

### 1️⃣ Clonar el Repositorio

```bash
git clone https://github.com/Moonikua/mi-bot-graph.git
cd mi-bot-graph
```

### 2️⃣ Instalar Dependencias

```bash
npm install
```

### 3️⃣ Configurar Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```
TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxx
EMAIL_SENDER=bot.mcinverciones.chile@gmail.com
EMAIL_RECIPIENT=destinatario@empresa.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=bot.mcinverciones.chile@gmail.com
SMTP_PASSWORD=contraseña_o_clave_de_aplicacion
CRON_SCHEDULE=0 */4 * * *
TIMEZONE=America/Santiago
```

> ⚠️ **Importante:** Para Gmail, se recomienda utilizar una [clave de aplicación](https://support.google.com/accounts/answer/185833?hl=es) y habilitar acceso IMAP.

---

## 🚀 Ejecución del Bot

### Opción 1: Manual

```bash
npm start
```

### Opción 2: Producción con PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 📈 Monitoreo del Bot

Para ver los logs en tiempo real:

```bash
pm2 logs mci-bot
```

---

## 📂 Estructura Recomendada del Proyecto

```
├── src/
│   ├── auth.js
│   ├── deviceManager.js
│   ├── emailSender.js
│   ├── generateExcelReport.js
│   └── index.js
├── config/
│   ├── whitelist.json
│   ├── hardwareRequirements.json
├── temp/
│   └── managed_devices_report_YYYY-MM-DD.xlsx
├── .env
├── ecosystem.config.js
├── package.json
└── README.md
```

---

## 🛠️ Soporte

Para consultas técnicas, comunicarse con:  
📧 **soporte@mcinversiones.com**

---