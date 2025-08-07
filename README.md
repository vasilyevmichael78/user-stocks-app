# User Stocks App

A modern fullstack application for stock tracking and portfolio management built with React, NestJS, MongoDB, and Material-UI.

## 🚀 Features

- **User Authentication**: Secure JWT-based registration and login system
- **Stock Search**: Real-time stock data with multiple API providers (FMP & Finnhub)
- **Portfolio Management**: Add/remove stocks with optimistic updates for smooth UX
- **Stock Details**: Comprehensive company information including price, change, volume, and market cap
- **Responsive Design**: Modern Material-UI interface with dark/light theme support
- **Real-time Updates**: Live stock price updates and portfolio synchronization

## 🛠 Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for fast development and building
- **Material-UI (MUI)** for components and icons
- **React Router DOM** for navigation
- **TanStack Query** for API state management
- **Zustand** for global state management
- **Axios** for HTTP requests

### Backend
- **NestJS** with TypeScript
- **MongoDB** with Mongoose ODM
- **JWT** authentication with Passport
- **Multiple Stock API Providers** (Financial Modeling Prep & Finnhub)
- **Class Validator** for request validation
- **bcryptjs** for password hashing

### Development Tools
- **Nx Monorepo** for project management
- **Jest** for testing
- **Docker Compose** for MongoDB containerization
- **TypeScript** with strict configuration
- **ESLint & Prettier** for code quality

## 📋 Prerequisites

- **Node.js 18+** and npm
- **Docker** and Docker Compose
- **API Keys**:
  - Financial Modeling Prep API key (free at [financialmodelingprep.com](https://financialmodelingprep.com/))
  - Finnhub API key (free at [finnhub.io](https://finnhub.io/))

## 🚀 Quick Start

### 1. Clone Repository and Install Dependencies

```bash
git clone https://github.com/vasilyevmichael78/user-stocks-app.git
cd user-stocks-app
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env
```

Edit `.env` file with your API keys:
```env
# Stock API Keys
FMP_API_KEY=your-fmp-api-key-here
FINNHUB_API_KEY=your-finnhub-api-key-here

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here

# Database
MONGODB_URI=mongodb://localhost:27017/user-stocks-app
```

### 3. Build the Project

```bash
npm run build
```

### 4. Start Development Environment

```bash
npm run dev
```

This single command will:
- Start MongoDB container
- Wait for MongoDB to be ready
- Start both backend and frontend servers in parallel

### 5. Access the Application

- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3000
- **MongoDB**: localhost:27017

## 📜 Available Scripts

### Development Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | **Main development command** - Sets up environment and starts both frontend and backend |
| `npm run dev:setup` | Sets up development environment (MongoDB + health check) |
| `npm run dev:backend` | Start only the backend server (NestJS) |
| `npm run dev:frontend` | Start only the frontend server (React + Vite) |

### Docker Scripts

| Script | Description |
|--------|-------------|
| `npm run docker:up` | Start all Docker containers (MongoDB + Mongo Express) |
| `npm run docker:down` | Stop all Docker containers |
| `npm run docker:mongo` | Start only MongoDB container |
| `npm run docker:logs` | View logs from all containers |
| `npm run docker:clean` | Stop containers, remove volumes, and clean Docker system |

### Build & Test Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build all projects (frontend, backend, shared-types) |
| `npm run test` | Run tests for all projects |

### Utility Scripts

| Script | Description |
|--------|-------------|
| `npm run wait-for-mongo` | Wait for MongoDB to be ready (used internally) |

## 🏗 Project Structure

```
user-stocks-app/
├── backend/                 # NestJS backend application
│   ├── src/
│   │   ├── auth/           # Authentication module
│   │   ├── portfolio/      # Portfolio management
│   │   ├── stocks/         # Stock data providers
│   │   └── users/          # User management
│   └── package.json
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── pages/          # Application pages
│   │   ├── services/       # API services
│   │   └── stores/         # State management
│   └── package.json
├── shared-types/           # Shared TypeScript types
├── docker-compose.yml      # Docker configuration
└── package.json           # Root workspace configuration
```

## 🔧 Development Workflow

### Recommended Development Flow

1. **Initial Setup**:
   ```bash
   git clone <repo-url>
   cd user-stocks-app
   npm install
   cp .env.example .env
   # Edit .env with your API keys
   npm run build
   ```

2. **Daily Development**:
   ```bash
   npm run dev
   ```

3. **Individual Services** (if needed):
   ```bash
   # Terminal 1: Backend only
   npm run dev:backend
   
   # Terminal 2: Frontend only
   npm run dev:frontend
   ```

### Code Changes

- **Backend changes**: Automatically reload with hot module replacement
- **Frontend changes**: Hot reload with Vite for instant updates
- **Shared types changes**: Run `npm run build` to rebuild

## 🐳 Docker Configuration

The project uses Docker Compose for MongoDB:

```yaml
# docker-compose.yml includes:
- MongoDB (port 27017)
- Mongo Express (optional web UI on port 8081)
```

### MongoDB Management

```bash
# Start MongoDB
npm run docker:mongo

# Connect with mongo client
mongosh mongodb://localhost:27017/user-stocks-app

# View data in web interface (optional)
npm run docker:up  # Then visit http://localhost:8081
```

## 🔑 API Integration

### Stock Data Providers

The application uses multiple stock API providers with automatic failover:

1. **Financial Modeling Prep** (Primary)
   - Free tier: 250 requests/day
   - Provides: Real-time quotes, company profiles, market data

2. **Finnhub** (Secondary)
   - Free tier: 60 calls/minute
   - Provides: Stock quotes, company information

### Provider Configuration

The backend automatically switches between providers if one fails or hits rate limits.

## 🚨 Troubleshooting

### Common Issues

**MongoDB Connection Failed**
```bash
# Check if container is running
docker ps | grep mongo

# Restart MongoDB
npm run docker:down && npm run docker:mongo

# Check logs
npm run docker:logs
```

**API Rate Limit Errors**
- The app automatically switches to backup API provider
- Consider upgrading to paid API plans for higher limits

**Port Already in Use**
```bash
# Kill processes on ports 3000 or 4200
lsof -ti:3000 | xargs kill -9
lsof -ti:4200 | xargs kill -9
```

**Build Errors**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests for specific project
npx nx test backend
npx nx test frontend
npx nx test shared-types
```

## 🚀 Production Deployment

1. **Build all projects**:
   ```bash
   npm run build
   ```

2. **Environment variables**:
   - Set production API keys
   - Configure production MongoDB URI
   - Set secure JWT secret

3. **Run production builds**:
   ```bash
   # Backend
   cd backend && npm run start:prod
   
   # Frontend (serve dist folder)
   cd frontend && npm run preview
   ```

## 📝 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test them
4. Commit your changes: `git commit -m 'Add feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## 📞 Support

For issues or questions:
- Create an issue on GitHub
- Check the troubleshooting section above
- Review the API provider documentation
