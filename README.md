# MC-Desk — Panel de Gestión y Estadísticas para Servidores de Minecraft

Plataforma integral de monitoreo, administración, telemetría y tienda digital para servidores de Minecraft con interfaz moderna inspirada en Minecraft y mascota **Gengar**. Diseñado como accesorio listo para desplegar para dueños y administradores de comunidades de servidores.

---

## 1. Arquitectura del Proyecto

```text
                    ┌─────────────────────┐
                    │       VERCEL        │
                    │      FRONTEND       │
                    │    React + Vite     │
                    └──────────┬──────────┘
                               │ HTTPS / REST
                               ▼
                    ┌─────────────────────┐
                    │       RENDER        │
                    │       BACKEND       │
                    │ Node.js + Express   │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┴─────────────┐
                 ▼                           ▼
        ┌─────────────────┐       ┌─────────────────┐
        │    SUPABASE     │       │  MC-Desk Agent  │
        │   PostgreSQL    │       │ Servidor Linux  │
        └─────────────────┘       └────────┬────────┘
                                           │ Screen / Log Pointers
                                           ▼
                                  Minecraft Server
```

* **Frontend (Vercel):** React 18, Vite, diseño pixel-art fiel a la estética de Minecraft, HUD visual (corazones, comida, armadura, inventario, ping), microinteracciones táctiles inspiradas en la ingeniería de diseño de Emil Kowalski.
* **Backend (Render):** Node.js, Express, autenticación JWT, bcrypt, rate limiting, control de acceso por roles (RBAC), tienda digital con entrega instantánea de comandos y cola de auditoría.
* **Base de Datos (Supabase):** PostgreSQL relacional con esquema normalizado, auditoría y claves foráneas. Modo fallback *In-Memory Mock* para pruebas locales inmediatas sin base de datos.
* **Server Agent (Linux):** Daemon en Python 3 de ultra bajo consumo (< 15 MB RAM) sin puertos expuestos a Internet. Comunicación saliente segura por HTTPS.
* **SSH Direct Bridge (Opcional):** Conexión multiplexada rápida para entornos locales y servidores dedicados.

---

## 2. Características Principales

* 🎮 **Gestión de Modos de Juego**: Cambio instantáneo de gamemode (`Supervivencia`, `Creativo`, `Aventura`, `Espectador`) por jugador con interfaz limpia y feedback visual en tiempo real.
* 🛒 **MineMarket Integrado**: Catálogo de artículos digitales (Rangos, Kits, Llaves, Cosméticos, Monedas) con precios en `$ COP`, control de stock y plantillas de comando ejecutables (`/give {player} ...`, `/lp user {player} parent set ...`).
* 📊 **Telemetría y HUD en Vivo**: Monitoreo de TPS, RAM, CPU, jugadores conectados con avatars y métricas formateadas con números tabulares sin temblor de layout.
* 🛡️ **Seguridad Estricta**: Variables de entorno separadas mediante `.env.clone`, contraseñas hasheadas con `bcryptjs`, y tokens JWT.

---

## 3. Estructura del Repositorio

```text
MC-Desk/
├── .gitignore               # Protege archivos .env, node_modules y logs
├── .env.clone               # Plantilla maestra de variables de entorno
├── README.md                # Documentación del proyecto
├── render.yaml              # Blueprint para deploy automático en Render
├── mc.sh                    # CLI rápido de control del servidor
├── mc-api.sh                # CLI para gestión del servicio mc-api
├── backend/                 # API REST en Node.js + Express
│   ├── .env.clone           # Plantilla de variables para backend
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── config/          # Variables de entorno seguras
│       ├── db/              # Esquema SQL y conexión pool
│       ├── middleware/      # Auth JWT, AgentAuth, RateLimit
│       ├── routes/          # Auth, Servers, Players, Admin, Items, Agent
│       └── services/        # Auditoría, tokens y SSH Bridge
├── frontend/                # Interfaz React + Vite
│   ├── .env.clone           # Plantilla de variables para frontend
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── components/      # MineMarketView, GhostPanelCard, HUD, Consola
│       ├── context/         # AuthContext y ServerContext
│       ├── styles/          # Estilos Minecraft + Springs Emil Kowalski
│       └── pages/           # Dashboard interactivo y Login
└── server-agent/            # Daemon para el servidor de Minecraft
    ├── agent.py
    ├── config.json.example
    └── install.sh           # Instalador systemd de un solo paso
```

---

## 4. Instalación Local y Puesta en Marcha

### Prerrequisitos
* Node.js 18+ y npm
* Python 3.8+ (opcional para el agente o puente SSH)

### Paso 1: Configurar Variables de Entorno (.env)
Cada carpeta incluye su respectivo archivo `.env.clone`. Copia cada uno a su archivo `.env` privado:

```bash
# 1. Configurar Backend
cd backend
cp .env.clone .env
# Edita backend/.env con tus credenciales privadas (IPs, contraseñas, tokens)

# 2. Configurar Frontend
cd ../frontend
cp .env.clone .env
# Edita frontend/.env indicando la URL de tu backend
```

> [!IMPORTANT]
> Los archivos `.env` reales contienen contraseñas y claves privadas. Están permanentemente ignorados en `.gitignore` y **nunca** deben subirse a GitHub. Solo se suben los archivos `.env.clone` y `.env.example`.

### Paso 2: Iniciar el Backend
```bash
cd backend
npm install
npm run dev
```
El backend iniciará en `http://localhost:3000`. Si no se configura `DATABASE_URL`, operará en modo **in-memory mock** con datos de prueba preconfigurados.

### Paso 3: Iniciar el Frontend
```bash
cd frontend
npm install
npm run dev
```
El frontend abrirá en `http://localhost:5173`.

---

## 5. Configuración de la Base de Datos (Opcional - Supabase)

1. Crea un proyecto en [Supabase](https://supabase.com).
2. Ve al editor SQL de Supabase y ejecuta el script:
   [`backend/src/db/schema.sql`](file:///Users/roger/Documents/McServer_1.20.1/MC-Desk/backend/src/db/schema.sql)
3. Copia tu Connection String (`postgresql://postgres:...@...`) y colócala en `DATABASE_URL` en `backend/.env`.

---

## 6. Despliegue en Producción

### Despliegue de Frontend en Vercel
1. Conecta tu repositorio de GitHub en Vercel.
2. Configura el directorio raíz (`Root Directory`) a: `frontend`.
3. Agrega la variable de entorno:
   * `VITE_API_URL`: `https://tu-backend-mc-desk.onrender.com`
   * `VITE_MC_DEFAULT_HOST`: `mc.tudominio.com`
4. Despliega con el framework preset **Vite**.

### Despliegue de Backend en Render
1. Conecta tu repositorio de GitHub en Render.
2. Selecciona **Web Service** con directorio raíz `backend` (o usa el blueprint `render.yaml`).
3. Configura las variables de entorno privadas en el panel de Render:
   * `NODE_ENV`: `production`
   * `PORT`: `10000`
   * `DATABASE_URL`: Tu URI de Supabase PostgreSQL
   * `JWT_SECRET`: Llave criptográfica aleatoria de 64 caracteres
   * `FRONTEND_ORIGIN`: Tu URL de Vercel (`https://mc-desk.vercel.app`)

---

## 7. Buenas Prácticas de Seguridad

1. **Nunca exponer secretos:** Todos los archivos `.env` están protegidos por `.gitignore` y no se incluyen en los commits.
2. **Uso de `.env.clone`:** Proporciona un esquema claro sin exponer credenciales para que cualquier usuario pueda clonar y desplegar su propia instancia.
3. **Contraseñas seguras:** Hasheadas con `bcryptjs` con salt de 10 rondas.
4. **Auditoría completa:** Cada entrega de artículos y comando de consola queda registrado con marca de tiempo.
