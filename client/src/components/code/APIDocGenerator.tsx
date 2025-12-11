import React, { useState } from 'react';
import { Card, Button, Input, Select, CodeBlock, Textarea } from '../common';
import { FileText, Copy, Download, Plus } from 'lucide-react';
import { useNotificationStore } from '../../stores';
import { useAppStore } from '../../stores';

interface APIEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  summary: string;
  description: string;
  tags: string[];
  requestBody?: boolean;
  responses: {
    status: string;
    description: string;
  }[];
}

export const APIDocGenerator: React.FC = () => {
  const { addNotification } = useNotificationStore();
  const { currentSchema } = useAppStore();
  const [apiTitle, setApiTitle] = useState('My API');
  const [apiVersion, setApiVersion] = useState('1.0.0');
  const [apiDescription, setApiDescription] = useState('API documentation');
  const [serverUrl, setServerUrl] = useState('http://localhost:3000/api');
  const [format, setFormat] = useState<'swagger' | 'openapi'>('openapi');
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>([]);

  const generateCRUDEndpoints = () => {
    if (!currentSchema?.tables || currentSchema.tables.length === 0) {
      addNotification({
        type: 'warning',
        title: 'Warning',
        message: 'Please generate a schema first to auto-generate CRUD endpoints'
      });
      return;
    }

    const newEndpoints: APIEndpoint[] = [];
    
    currentSchema.tables.forEach(table => {
      const resourceName = table.name.toLowerCase();
      const resourceNameSingular = resourceName.endsWith('s') ? resourceName.slice(0, -1) : resourceName;
      
      // GET all
      newEndpoints.push({
        path: `/${resourceName}`,
        method: 'GET',
        summary: `Get all ${resourceName}`,
        description: `Retrieve a list of all ${resourceName}`,
        tags: [table.name],
        responses: [
          { status: '200', description: 'Successful response' },
          { status: '500', description: 'Server error' }
        ]
      });

      // GET by ID
      newEndpoints.push({
        path: `/${resourceName}/{id}`,
        method: 'GET',
        summary: `Get ${resourceNameSingular} by ID`,
        description: `Retrieve a specific ${resourceNameSingular} by ID`,
        tags: [table.name],
        responses: [
          { status: '200', description: 'Successful response' },
          { status: '404', description: 'Not found' },
          { status: '500', description: 'Server error' }
        ]
      });

      // POST
      newEndpoints.push({
        path: `/${resourceName}`,
        method: 'POST',
        summary: `Create ${resourceNameSingular}`,
        description: `Create a new ${resourceNameSingular}`,
        tags: [table.name],
        requestBody: true,
        responses: [
          { status: '201', description: 'Created successfully' },
          { status: '400', description: 'Bad request' },
          { status: '500', description: 'Server error' }
        ]
      });

      // PUT
      newEndpoints.push({
        path: `/${resourceName}/{id}`,
        method: 'PUT',
        summary: `Update ${resourceNameSingular}`,
        description: `Update an existing ${resourceNameSingular}`,
        tags: [table.name],
        requestBody: true,
        responses: [
          { status: '200', description: 'Updated successfully' },
          { status: '404', description: 'Not found' },
          { status: '400', description: 'Bad request' },
          { status: '500', description: 'Server error' }
        ]
      });

      // DELETE
      newEndpoints.push({
        path: `/${resourceName}/{id}`,
        method: 'DELETE',
        summary: `Delete ${resourceNameSingular}`,
        description: `Delete a ${resourceNameSingular} by ID`,
        tags: [table.name],
        responses: [
          { status: '204', description: 'Deleted successfully' },
          { status: '404', description: 'Not found' },
          { status: '500', description: 'Server error' }
        ]
      });
    });

    setEndpoints(newEndpoints);
    addNotification({
      type: 'success',
      title: 'Success',
      message: `Generated ${newEndpoints.length} CRUD endpoints for ${currentSchema.tables.length} tables`
    });
  };

  const generateOpenAPISpec = (): string => {
    const spec: any = {
      openapi: '3.0.0',
      info: {
        title: apiTitle,
        version: apiVersion,
        description: apiDescription
      },
      servers: [
        {
          url: serverUrl,
          description: 'Development server'
        }
      ],
      paths: {}
    };

    // Group endpoints by path
    endpoints.forEach(endpoint => {
      if (!spec.paths[endpoint.path]) {
        spec.paths[endpoint.path] = {};
      }

      const operation: any = {
        summary: endpoint.summary,
        description: endpoint.description,
        tags: endpoint.tags,
        responses: {}
      };

      endpoint.responses.forEach(resp => {
        operation.responses[resp.status] = {
          description: resp.description,
          content: {
            'application/json': {
              schema: {
                type: 'object'
              }
            }
          }
        };
      });

      if (endpoint.requestBody) {
        operation.requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {}
              }
            }
          }
        };
      }

      // Add path parameters
      if (endpoint.path.includes('{')) {
        operation.parameters = [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string'
            },
            description: 'Resource ID'
          }
        ];
      }

      spec.paths[endpoint.path][endpoint.method.toLowerCase()] = operation;
    });

    return JSON.stringify(spec, null, 2);
  };

  const generateSwaggerSpec = (): string => {
    const spec: any = {
      swagger: '2.0',
      info: {
        title: apiTitle,
        version: apiVersion,
        description: apiDescription
      },
      host: new URL(serverUrl).host,
      basePath: new URL(serverUrl).pathname,
      schemes: [new URL(serverUrl).protocol.replace(':', '')],
      paths: {}
    };

    endpoints.forEach(endpoint => {
      if (!spec.paths[endpoint.path]) {
        spec.paths[endpoint.path] = {};
      }

      const operation: any = {
        summary: endpoint.summary,
        description: endpoint.description,
        tags: endpoint.tags,
        produces: ['application/json'],
        responses: {}
      };

      endpoint.responses.forEach(resp => {
        operation.responses[resp.status] = {
          description: resp.description
        };
      });

      if (endpoint.requestBody) {
        operation.consumes = ['application/json'];
        operation.parameters = [
          {
            in: 'body',
            name: 'body',
            required: true,
            schema: {
              type: 'object'
            }
          }
        ];
      }

      if (endpoint.path.includes('{')) {
        if (!operation.parameters) operation.parameters = [];
        operation.parameters.push({
          name: 'id',
          in: 'path',
          required: true,
          type: 'string',
          description: 'Resource ID'
        });
      }

      spec.paths[endpoint.path][endpoint.method.toLowerCase()] = operation;
    });

    return JSON.stringify(spec, null, 2);
  };

  const documentation = format === 'openapi' ? generateOpenAPISpec() : generateSwaggerSpec();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(documentation);
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'API documentation copied to clipboard!'
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
    const blob = new Blob([documentation], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = format === 'openapi' ? 'openapi.json' : 'swagger.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addNotification({
      type: 'success',
      title: 'Success',
      message: 'API documentation downloaded!'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" />
          API Documentation Generator
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Input
            label="API Title"
            value={apiTitle}
            onChange={(e) => setApiTitle(e.target.value)}
            placeholder="My API"
          />

          <Input
            label="Version"
            value={apiVersion}
            onChange={(e) => setApiVersion(e.target.value)}
            placeholder="1.0.0"
          />

          <Input
            label="Server URL"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="http://localhost:3000/api"
            className="md:col-span-2"
          />

          <Textarea
            label="Description"
            value={apiDescription}
            onChange={(e) => setApiDescription(e.target.value)}
            placeholder="API description..."
            rows={3}
            className="md:col-span-2"
          />

          <Select
            label="Specification Format"
            value={format}
            onChange={(e) => setFormat(e.target.value as 'swagger' | 'openapi')}
            options={[
              { value: 'openapi', label: 'OpenAPI 3.0' },
              { value: 'swagger', label: 'Swagger 2.0' }
            ]}
          />
        </div>

        <div className="flex gap-2 mb-6">
          <Button onClick={generateCRUDEndpoints} className="flex-1">
            <Plus className="w-4 h-4 mr-2" />
            Auto-Generate CRUD Endpoints
          </Button>
        </div>

        {endpoints.length > 0 && (
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">
              Endpoints ({endpoints.length})
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {endpoints.map((endpoint, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      endpoint.method === 'GET' ? 'bg-green-100 text-green-700' :
                      endpoint.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                      endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                      endpoint.method === 'PATCH' ? 'bg-purple-100 text-purple-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {endpoint.method}
                    </span>
                    <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                      {endpoint.path}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {endpoint.summary}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleCopy} variant="secondary" className="flex-1">
            <Copy className="w-4 h-4 mr-2" />
            Copy to Clipboard
          </Button>
          <Button onClick={handleDownload} className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Download {format === 'openapi' ? 'OpenAPI' : 'Swagger'} Spec
          </Button>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Generated {format === 'openapi' ? 'OpenAPI 3.0' : 'Swagger 2.0'} Specification
        </h3>
        <CodeBlock
          code={documentation}
          language="json"
          filename={format === 'openapi' ? 'openapi.json' : 'swagger.json'}
          showLineNumbers
        />
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          How to Use
        </h3>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <h4 className="font-medium mb-2">1. Swagger UI</h4>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Import the specification into Swagger UI for interactive API documentation:
            </p>
            <CodeBlock
              code={`npx swagger-ui-watcher ${format === 'openapi' ? 'openapi.json' : 'swagger.json'}`}
              language="bash"
              showLineNumbers={false}
            />
          </div>

          <div>
            <h4 className="font-medium mb-2">2. Postman</h4>
            <p className="text-gray-600 dark:text-gray-400">
              Import the JSON file directly into Postman to create a collection with all endpoints.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">3. Redoc</h4>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Generate beautiful documentation with Redoc:
            </p>
            <CodeBlock
              code={`npx redoc-cli bundle ${format === 'openapi' ? 'openapi.json' : 'swagger.json'}`}
              language="bash"
              showLineNumbers={false}
            />
          </div>

          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
              💡 Tip
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-400">
              Use the auto-generate feature to quickly create CRUD endpoints for all tables in your schema.
              You can then customize the generated specification as needed.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
