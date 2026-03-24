# CareHub Web

React + Vite web client for CareHub.

## Prerequisites

- Node.js and npm
- .NET 8 SDK
- Docker Desktop

## Backend Startup

From the repo root, start PostgreSQL:

```powershell
docker compose up -d
```

Then start the API:

```powershell
dotnet run --project .\CareHub.Api\CareHub.Api.csproj --launch-profile http
```

Verify:

- `http://localhost:5007/health`
- `http://localhost:5007/swagger`

## Run The Web App

From `CareHub.Web`:

```powershell
npm.cmd install
npm.cmd run dev
```

Vite should start the web app on a local dev URL, usually:

- `http://localhost:5173`

## Available Scripts

- `npm.cmd run dev`
- `npm.cmd run build`
- `npm.cmd run preview`

## API Base URL

The web app currently uses:

- `http://localhost:5007/api`

Defined in:

- `src/api.js`
