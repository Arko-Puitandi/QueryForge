import React, { useState } from 'react';
import { Card, Button, Input, Select, CodeBlock } from '../common';
import { Container, Copy, Download } from 'lucide-react';
import { useNotificationStore } from '../../stores';

interface DockerService {
  name: string;
  image: string;
  ports: string[];
  environment: Record<string, string>;
  volumes: string[];
  dependsOn?: string[];
}

interface DockerComposeGeneratorProps {
  databaseType?: string;
}

export const DockerComposeGenerator: React.FC<DockerComposeGeneratorProps> = ({ 
  databaseType: initialDbType 
}) => {
  const { addNotification } = useNotificationStore();
  const [dbType, setDbType] = useState(initialDbType || 'postgresql');
  const [projectName, setProjectName] = useState('my-app');
  const [includeRedis, setIncludeRedis] = useState(false);
  const [includeNginx, setIncludeNginx] = useState(false);
  const [includeApp, setIncludeApp] = useState(true);

  const databaseConfigs: Record<string, DockerService> = {
    postgresql: {
      name: 'postgres',
      image: 'postgres:15-alpine',
      ports: ['5432:5432'],
      environment: {
        POSTGRES_USER: 'admin',
        POSTGRES_PASSWORD: 'password123',
        POSTGRES_DB: 'myapp_db',
        PGDATA: '/var/lib/postgresql/data/pgdata'
      },
      volumes: [
        'postgres_data:/var/lib/postgresql/data'
      ]
    },
    mysql: {
      name: 'mysql',
      image: 'mysql:8.0',
      ports: ['3306:3306'],
      environment: {
        MYSQL_ROOT_PASSWORD: 'root123',
        MYSQL_DATABASE: 'myapp_db',
        MYSQL_USER: 'admin',
        MYSQL_PASSWORD: 'password123'
      },
      volumes: [
        'mysql_data:/var/lib/mysql'
      ]
    },
    mongodb: {
      name: 'mongodb',
      image: 'mongo:7',
      ports: ['27017:27017'],
      environment: {
        MONGO_INITDB_ROOT_USERNAME: 'admin',
        MONGO_INITDB_ROOT_PASSWORD: 'password123',
        MONGO_INITDB_DATABASE: 'myapp_db'
      },
      volumes: [
        'mongodb_data:/data/db',
        'mongodb_config:/data/configdb'
      ]
    },
    redis: {
      name: 'redis',
      image: 'redis:7-alpine',
      ports: ['6379:6379'],
      environment: {},
      volumes: [
        'redis_data:/data'
      ]
    },
    sqlserver: {
      name: 'sqlserver',
      image: 'mcr.microsoft.com/mssql/server:2022-latest',
      ports: ['1433:1433'],
      environment: {
        ACCEPT_EULA: 'Y',
        SA_PASSWORD: 'YourStrong@Passw0rd',
        MSSQL_PID: 'Developer'
      },
      volumes: [
        'sqlserver_data:/var/opt/mssql'
      ]
    }
  };

  const generateDockerCompose = (): string => {
    const services: DockerService[] = [];
    
    // Add database service
    const dbConfig = databaseConfigs[dbType];
    if (dbConfig) {
      services.push(dbConfig);
    }

    // Add Redis if selected
    if (includeRedis) {
      services.push(databaseConfigs.redis);
    }

    // Add application service
    if (includeApp) {
      services.push({
        name: 'app',
        image: 'node:20-alpine',
        ports: ['3000:3000'],
        environment: {
          NODE_ENV: 'development',
          DATABASE_URL: getDatabaseUrl(dbType),
          ...(includeRedis ? { REDIS_URL: 'redis://redis:6379' } : {})
        },
        volumes: [
          './server:/app',
          '/app/node_modules'
        ],
        dependsOn: [dbConfig.name, ...(includeRedis ? ['redis'] : [])]
      });
    }

    // Add Nginx if selected
    if (includeNginx) {
      services.push({
        name: 'nginx',
        image: 'nginx:alpine',
        ports: ['80:80', '443:443'],
        environment: {},
        volumes: [
          './nginx.conf:/etc/nginx/nginx.conf:ro',
          './client/dist:/usr/share/nginx/html:ro'
        ],
        dependsOn: includeApp ? ['app'] : []
      });
    }

    // Build YAML
    let yaml = `version: '3.8'\n\nservices:\n`;

    services.forEach(service => {
      yaml += `  ${service.name}:\n`;
      yaml += `    image: ${service.image}\n`;
      yaml += `    container_name: ${projectName}_${service.name}\n`;
      
      if (service.ports.length > 0) {
        yaml += `    ports:\n`;
        service.ports.forEach(port => {
          yaml += `      - "${port}"\n`;
        });
      }

      if (Object.keys(service.environment).length > 0) {
        yaml += `    environment:\n`;
        Object.entries(service.environment).forEach(([key, value]) => {
          yaml += `      ${key}: ${value}\n`;
        });
      }

      if (service.volumes.length > 0) {
        yaml += `    volumes:\n`;
        service.volumes.forEach(volume => {
          yaml += `      - ${volume}\n`;
        });
      }

      if (service.dependsOn && service.dependsOn.length > 0) {
        yaml += `    depends_on:\n`;
        service.dependsOn.forEach(dep => {
          yaml += `      - ${dep}\n`;
        });
      }

      if (service.name === 'app') {
        yaml += `    working_dir: /app\n`;
        yaml += `    command: npm run dev\n`;
      }

      if (service.name === dbConfig.name) {
        yaml += `    restart: unless-stopped\n`;
        yaml += `    healthcheck:\n`;
        yaml += `      test: ${getHealthCheck(dbType)}\n`;
        yaml += `      interval: 10s\n`;
        yaml += `      timeout: 5s\n`;
        yaml += `      retries: 5\n`;
      }

      yaml += `    networks:\n`;
      yaml += `      - ${projectName}_network\n\n`;
    });

    // Add volumes
    yaml += `volumes:\n`;
    const allVolumes = new Set<string>();
    services.forEach(service => {
      service.volumes.forEach(vol => {
        const volumeName = vol.split(':')[0];
        if (!volumeName.startsWith('.') && !volumeName.startsWith('/')) {
          allVolumes.add(volumeName);
        }
      });
    });
    allVolumes.forEach(vol => {
      yaml += `  ${vol}:\n`;
    });

    // Add network
    yaml += `\nnetworks:\n`;
    yaml += `  ${projectName}_network:\n`;
    yaml += `    driver: bridge\n`;

    return yaml;
  };

  const getDatabaseUrl = (type: string): string => {
    const configs: Record<string, string> = {
      postgresql: 'postgresql://admin:password123@postgres:5432/myapp_db',
      mysql: 'mysql://admin:password123@mysql:3306/myapp_db',
      mongodb: 'mongodb://admin:password123@mongodb:27017/myapp_db?authSource=admin',
      sqlserver: 'sqlserver://sa:YourStrong@Passw0rd@sqlserver:1433/myapp_db'
    };
    return configs[type] || '';
  };

  const getHealthCheck = (type: string): string => {
    const checks: Record<string, string> = {
      postgresql: '["CMD-SHELL", "pg_isready -U admin -d myapp_db"]',
      mysql: '["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "admin", "-ppassword123"]',
      mongodb: '["CMD", "mongosh", "--eval", "db.adminCommand(\'ping\')"]',
      sqlserver: '["CMD-SHELL", "/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P YourStrong@Passw0rd -Q \'SELECT 1\'"]'
    };
    return checks[type] || '["CMD-SHELL", "exit 0"]';
  };

  const dockerCompose = generateDockerCompose();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(dockerCompose);
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Docker Compose configuration copied to clipboard!'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to copy to clipboard'
      });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([dockerCompose], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'docker-compose.yml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addNotification({
      type: 'success',
      title: 'Success',
      message: 'Docker Compose file downloaded!'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Container className="w-6 h-6 text-blue-600" />
          Docker Compose Generator
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Input
            label="Project Name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
            placeholder="my-app"
            helperText="Used as prefix for container names"
          />

          <Select
            label="Database Type"
            value={dbType}
            onChange={(e) => setDbType(e.target.value)}
            options={[
              { value: 'postgresql', label: 'PostgreSQL' },
              { value: 'mysql', label: 'MySQL' },
              { value: 'mongodb', label: 'MongoDB' },
              { value: 'sqlserver', label: 'SQL Server' }
            ]}
          />
        </div>

        <div className="space-y-3 mb-6">
          <h3 className="font-medium text-gray-900 dark:text-white">Additional Services</h3>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeApp}
              onChange={(e) => setIncludeApp(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Include Application Service (Node.js)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeRedis}
              onChange={(e) => setIncludeRedis(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Include Redis (Caching)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeNginx}
              onChange={(e) => setIncludeNginx(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Include Nginx (Reverse Proxy)</span>
          </label>
        </div>

        <div className="flex gap-2 mb-4">
          <Button onClick={handleCopy} variant="secondary" className="flex-1">
            <Copy className="w-4 h-4 mr-2" />
            Copy to Clipboard
          </Button>
          <Button onClick={handleDownload} className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Download File
          </Button>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Generated docker-compose.yml
        </h3>
        <CodeBlock
          code={dockerCompose}
          language="yaml"
          filename="docker-compose.yml"
          showLineNumbers
        />
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Start Guide
        </h3>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <h4 className="font-medium mb-2">1. Save the configuration</h4>
            <p className="text-gray-600 dark:text-gray-400">
              Save the generated docker-compose.yml file in your project root directory.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">2. Start the services</h4>
            <CodeBlock
              code="docker-compose up -d"
              language="bash"
              showLineNumbers={false}
            />
          </div>

          <div>
            <h4 className="font-medium mb-2">3. Check service status</h4>
            <CodeBlock
              code="docker-compose ps"
              language="bash"
              showLineNumbers={false}
            />
          </div>

          <div>
            <h4 className="font-medium mb-2">4. View logs</h4>
            <CodeBlock
              code="docker-compose logs -f"
              language="bash"
              showLineNumbers={false}
            />
          </div>

          <div>
            <h4 className="font-medium mb-2">5. Stop services</h4>
            <CodeBlock
              code="docker-compose down"
              language="bash"
              showLineNumbers={false}
            />
          </div>

          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
              💡 Database Connection String
            </h4>
            <code className="text-xs text-blue-800 dark:text-blue-400 break-all">
              {getDatabaseUrl(dbType)}
            </code>
          </div>
        </div>
      </Card>
    </div>
  );
};
