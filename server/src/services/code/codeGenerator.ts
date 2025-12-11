import { geminiService } from '../llm/geminiService.js';
import { codePrompts } from '../llm/prompts/codePrompts.js';
import {
  Schema,
  CodeRequest,
  GeneratedCode,
  GeneratedFile,
  TargetLanguage,
  Framework,
  Table,
} from '../../types/index.js';

export class CodeGenerator {
  /**
   * Generate complete code for schema
   * Hybrid approach: Try LLM first, fallback to static templates
   */
  async generateCode(request: CodeRequest): Promise<GeneratedCode> {
    console.log('[CodeGenerator] generateCode called with:', {
      language: request.language,
      framework: request.framework,
      tablesCount: request.schema?.tables?.length || 0,
    });

    // Try LLM-powered generation first for better quality
    try {
      console.log('[CodeGenerator] Attempting LLM-powered generation...');
      return await this.generateWithLLM(request);
    } catch (error) {
      console.warn('[CodeGenerator] LLM generation failed, falling back to static templates:', error);
      return this.generateStaticCode(request);
    }
  }

  /**
   * LLM-powered code generation
   * Generates high-quality, context-aware code
   */
  private async generateWithLLM(request: CodeRequest): Promise<GeneratedCode> {
    const { schema, language, framework, options } = request;
    
    console.log('[CodeGenerator] Generating code with AI for', language, framework);
    
    // Build comprehensive prompt
    const prompt = codePrompts.buildCodePrompt(request);
    
    // Get AI-generated code
    const response = await geminiService.generate(prompt);
    
    // Parse JSON response
    let result: { files: GeneratedFile[]; projectStructure?: string };
    try {
      // Extract JSON from response (might be wrapped in markdown)
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                        response.match(/\{[\s\S]*"files"[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        result = JSON.parse(jsonStr);
      } else {
        throw new Error('No JSON found in LLM response');
      }
    } catch (parseError) {
      console.error('[CodeGenerator] Failed to parse LLM response:', parseError);
      throw new Error('LLM response parsing failed');
    }

    // Validate and enhance generated files
    const files = result.files || [];
    
    if (files.length === 0) {
      throw new Error('LLM generated no files');
    }

    console.log('[CodeGenerator] LLM generation successful, generated', files.length, 'files');

    return {
      files,
      language,
      framework: framework || 'default',
      projectStructure: result.projectStructure || this.generateProjectStructure(files),
    };
  }

  /**
   * Static code generation that always works
   */
  private async generateStaticCode(request: CodeRequest): Promise<GeneratedCode> {
    const { schema, language, framework, options } = request;
    const files: GeneratedFile[] = [];

    console.log('[CodeGenerator] Static generation for', language, framework);

    // Generate entities
    const entities = await this.generateEntities(schema, language, framework as Framework, {
      packageName: options?.packageName,
      includeComments: options?.includeComments,
    });
    files.push(...entities);

    // Generate DTOs
    if (options?.includeDTO !== false) {
      const dtos = this.generateDTOs(schema, language, framework as Framework, options?.packageName);
      files.push(...dtos);
    }

    // Generate repositories if requested
    if (options?.includeRepository !== false) {
      const repositories = this.generateRepositories(schema, language, framework as Framework, options?.packageName);
      files.push(...repositories);
    }

    // Generate services if requested
    if (options?.includeService !== false) {
      const services = this.generateServices(schema, language, framework as Framework, options?.packageName);
      files.push(...services);
    }

    // Generate controllers if requested
    if (options?.includeController) {
      const controllers = this.generateControllers(schema, language, framework as Framework, options?.packageName);
      files.push(...controllers);
    }

    // Generate exception handlers
    const exceptions = this.generateExceptionHandlers(schema, language, framework as Framework, options?.packageName);
    files.push(...exceptions);

    // Generate migrations if requested
    if (options?.includeMigration !== false) {
      const migrations = this.generateMigrations(schema, language, framework as Framework);
      files.push(...migrations);
    }

    // Generate configuration files
    const configs = this.generateConfigFiles(schema, language, framework as Framework, options?.packageName);
    files.push(...configs);

    // Generate main application file
    const mainFile = this.generateMainFile(schema, language, framework as Framework, options?.packageName);
    if (mainFile) files.push(mainFile);

    console.log('[CodeGenerator] Static generation complete, generated', files.length, 'files');

    return {
      files,
      language,
      framework: framework || 'default',
      projectStructure: this.generateProjectStructure(files),
    };
  }

  /**
   * Generate DTO classes
   */
  private generateDTOs(
    schema: Schema,
    language: TargetLanguage,
    framework: Framework,
    packageName?: string
  ): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const pkg = packageName || 'com.app';

    for (const table of schema.tables) {
      const className = this.pascalCase(table.name);

      if (language === 'java' && framework === 'spring-boot') {
        // DTO
        files.push({
          path: `src/main/java/${pkg.replace(/\./g, '/')}/dto/`,
          filename: `${className}DTO.java`,
          content: `package ${pkg}.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ${className}DTO {
${table.columns.map(col => `    private ${this.mapTypeToJava(col.type)} ${this.camelCase(col.name)};`).join('\n')}
}
`,
          type: 'dto',
        });

        // CreateDTO
        files.push({
          path: `src/main/java/${pkg.replace(/\./g, '/')}/dto/`,
          filename: `${className}CreateDTO.java`,
          content: `package ${pkg}.dto;

import lombok.Data;
import jakarta.validation.constraints.*;

@Data
public class ${className}CreateDTO {
${table.columns.filter(c => !c.autoIncrement).map(col => {
  let validation = '';
  if (!col.nullable) validation = '    @NotNull\n';
  if (col.type.includes('VARCHAR')) {
    const match = col.type.match(/\((\d+)\)/);
    if (match) validation += `    @Size(max = ${match[1]})\n`;
  }
  return `${validation}    private ${this.mapTypeToJava(col.type)} ${this.camelCase(col.name)};`;
}).join('\n\n')}
}
`,
          type: 'dto',
        });

        // UpdateDTO
        files.push({
          path: `src/main/java/${pkg.replace(/\./g, '/')}/dto/`,
          filename: `${className}UpdateDTO.java`,
          content: `package ${pkg}.dto;

import lombok.Data;
import jakarta.validation.constraints.*;

@Data
public class ${className}UpdateDTO {
${table.columns.filter(c => !c.primaryKey).map(col => {
  let validation = '';
  if (col.type.includes('VARCHAR')) {
    const match = col.type.match(/\((\d+)\)/);
    if (match) validation = `    @Size(max = ${match[1]})\n`;
  }
  return `${validation}    private ${this.mapTypeToJava(col.type)} ${this.camelCase(col.name)};`;
}).join('\n\n')}
}
`,
          type: 'dto',
        });
      }
    }

    return files;
  }

  /**
   * Generate exception handlers
   */
  private generateExceptionHandlers(
    schema: Schema,
    language: TargetLanguage,
    framework: Framework,
    packageName?: string
  ): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const pkg = packageName || 'com.app';

    if (language === 'java' && framework === 'spring-boot') {
      files.push({
        path: `src/main/java/${pkg.replace(/\./g, '/')}/exception/`,
        filename: 'ResourceNotFoundException.java',
        content: `package ${pkg}.exception;

public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
`,
        type: 'other',
      });

      files.push({
        path: `src/main/java/${pkg.replace(/\./g, '/')}/exception/`,
        filename: 'GlobalExceptionHandler.java',
        content: `package ${pkg}.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleResourceNotFoundException(
            ResourceNotFoundException ex, WebRequest request) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("message", ex.getMessage());
        body.put("status", HttpStatus.NOT_FOUND.value());
        return new ResponseEntity<>(body, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGlobalException(
            Exception ex, WebRequest request) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("message", ex.getMessage());
        body.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
        return new ResponseEntity<>(body, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
`,
        type: 'other',
      });
    }

    return files;
  }

  /**
   * Generate migration files
   */
  private generateMigrations(
    schema: Schema,
    language: TargetLanguage,
    framework: Framework
  ): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    if (language === 'java' && framework === 'spring-boot') {
      let sql = `-- Migration: Create ${schema.name} tables\n\n`;
      
      schema.tables.forEach(table => {
        sql += `CREATE TABLE ${table.name} (\n`;
        sql += table.columns.map(col => {
          let line = `    ${col.name} ${col.type}`;
          if (col.primaryKey) line += ' PRIMARY KEY';
          if (col.autoIncrement) line += ' AUTO_INCREMENT';
          if (!col.nullable) line += ' NOT NULL';
          if (col.unique && !col.primaryKey) line += ' UNIQUE';
          if (col.defaultValue) line += ` DEFAULT ${col.defaultValue}`;
          return line;
        }).join(',\n');
        sql += `\n);\n\n`;

        // Add indexes
        table.indexes?.forEach(idx => {
          sql += `CREATE ${idx.unique ? 'UNIQUE ' : ''}INDEX ${idx.name} ON ${table.name} (${idx.columns.join(', ')});\n`;
        });
        sql += '\n';
      });

      files.push({
        path: 'src/main/resources/db/migration/',
        filename: 'V1__Initial_schema.sql',
        content: sql,
        type: 'migration',
      });
    }

    return files;
  }

  /**
   * Generate configuration files
   */
  private generateConfigFiles(
    schema: Schema,
    language: TargetLanguage,
    framework: Framework,
    packageName?: string
  ): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const pkg = packageName || 'com.app';

    if (language === 'java' && framework === 'spring-boot') {
      files.push({
        path: 'src/main/resources/',
        filename: 'application.properties',
        content: `# Spring Boot Configuration
spring.application.name=${schema.name || 'app'}

# Database Configuration
spring.datasource.url=jdbc:${schema.databaseType}://localhost:5432/${schema.name}
spring.datasource.username=postgres
spring.datasource.password=password
spring.datasource.driver-class-name=org.postgresql.Driver

# JPA Configuration
spring.jpa.hibernate.ddl-auto=none
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect

# Flyway Migration
spring.flyway.enabled=true
spring.flyway.locations=classpath:db/migration
spring.flyway.baseline-on-migrate=true

# Server Configuration
server.port=8080

# Logging
logging.level.${pkg}=DEBUG
logging.level.org.springframework.web=INFO
`,
        type: 'config',
      });

      files.push({
        path: '/',
        filename: 'pom.xml',
        content: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.5</version>
        <relativePath/>
    </parent>
    
    <groupId>${pkg}</groupId>
    <artifactId>${schema.name || 'app'}</artifactId>
    <version>1.0.0</version>
    <name>${schema.name || 'app'}</name>
    <description>Generated Spring Boot Application</description>
    
    <properties>
        <java.version>17</java.version>
    </properties>
    
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-core</artifactId>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-database-postgresql</artifactId>
        </dependency>
    </dependencies>
    
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
`,
        type: 'config',
      });

      files.push({
        path: '/',
        filename: 'README.md',
        content: `# ${schema.name || 'Generated'} Application

## Description
This is an auto-generated Spring Boot application with JPA entities, repositories, services, and REST controllers.

## Prerequisites
- Java 17 or higher
- Maven 3.6+
- PostgreSQL 12+

## Setup
1. Create database: \`CREATE DATABASE ${schema.name};\`
2. Update \`application.properties\` with your database credentials
3. Run: \`mvn spring-boot:run\`

## API Endpoints
${schema.tables.map(t => `- \`/api/${t.name.toLowerCase()}\` - CRUD operations for ${t.name}`).join('\n')}

## Technology Stack
- Spring Boot 3.2.5
- Spring Data JPA
- PostgreSQL
- Lombok
- Flyway Migration
`,
        type: 'other',
      });
    }

    return files;
  }

  /**
   * Generate main application file
   */
  private generateMainFile(
    schema: Schema,
    language: TargetLanguage,
    framework: Framework,
    packageName?: string
  ): GeneratedFile | null {
    const pkg = packageName || 'com.app';

    if (language === 'java' && framework === 'spring-boot') {
      const className = this.pascalCase(schema.name || 'App') + 'Application';
      return {
        path: `src/main/java/${pkg.replace(/\./g, '/')}/`,
        filename: `${className}.java`,
        content: `package ${pkg};

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ${className} {

    public static void main(String[] args) {
        SpringApplication.run(${className}.class, args);
    }
}
`,
        type: 'other',
      };
    }

    return null;
  }

  /**
   * Generate repository classes
   */
  private generateRepositories(
    schema: Schema,
    language: TargetLanguage,
    framework: Framework,
    packageName?: string
  ): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const pkg = packageName || 'com.app';

    for (const table of schema.tables) {
      const className = this.pascalCase(table.name);
      let content = '';
      let filename = '';
      let path = '';

      switch (language) {
        case 'java':
          filename = `${className}Repository.java`;
          path = `src/main/java/${pkg.replace(/\./g, '/')}/repository/`;
          content = `package ${pkg}.repository;

import ${pkg}.entity.${className};
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ${className}Repository extends JpaRepository<${className}, Long> {
    
    // Find all active records
    List<${className}> findAll();
    
    // Find by ID
    Optional<${className}> findById(Long id);
    
    // Custom query example
    @Query("SELECT e FROM ${className} e WHERE e.id = :id")
    Optional<${className}> findByIdCustom(Long id);
}
`;
          break;

        case 'python':
          filename = `${table.name}_repository.py`;
          path = 'app/repositories/';
          content = `from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.${table.name} import ${className}


class ${className}Repository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> List[${className}]:
        return self.db.query(${className}).all()

    def get_by_id(self, id: int) -> Optional[${className}]:
        return self.db.query(${className}).filter(${className}.id == id).first()

    def create(self, entity: ${className}) -> ${className}:
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def update(self, entity: ${className}) -> ${className}:
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def delete(self, id: int) -> bool:
        entity = self.get_by_id(id)
        if entity:
            self.db.delete(entity)
            self.db.commit()
            return True
        return False
`;
          break;

        case 'nodejs':
          filename = `${className}Repository.ts`;
          path = 'src/repositories/';
          content = `import { ${className} } from '../entities/${className}';

export class ${className}Repository {
  private items: ${className}[] = [];

  async findAll(): Promise<${className}[]> {
    return this.items;
  }

  async findById(id: number): Promise<${className} | undefined> {
    return this.items.find(item => item.id === id);
  }

  async create(data: Partial<${className}>): Promise<${className}> {
    const entity = { ...data, id: Date.now() } as ${className};
    this.items.push(entity);
    return entity;
  }

  async update(id: number, data: Partial<${className}>): Promise<${className} | undefined> {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return undefined;
    this.items[index] = { ...this.items[index], ...data };
    return this.items[index];
  }

  async delete(id: number): Promise<boolean> {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return false;
    this.items.splice(index, 1);
    return true;
  }
}

export const ${this.camelCase(table.name)}Repository = new ${className}Repository();
`;
          break;

        case 'csharp':
          filename = `${className}Repository.cs`;
          path = 'Repositories/';
          content = `using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ${pkg}.Entities;

namespace ${pkg}.Repositories
{
    public interface I${className}Repository
    {
        Task<IEnumerable<${className}>> GetAllAsync();
        Task<${className}> GetByIdAsync(int id);
        Task<${className}> CreateAsync(${className} entity);
        Task<${className}> UpdateAsync(${className} entity);
        Task<bool> DeleteAsync(int id);
    }

    public class ${className}Repository : I${className}Repository
    {
        private readonly AppDbContext _context;

        public ${className}Repository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<${className}>> GetAllAsync()
        {
            return await _context.${className}s.ToListAsync();
        }

        public async Task<${className}> GetByIdAsync(int id)
        {
            return await _context.${className}s.FindAsync(id);
        }

        public async Task<${className}> CreateAsync(${className} entity)
        {
            _context.${className}s.Add(entity);
            await _context.SaveChangesAsync();
            return entity;
        }

        public async Task<${className}> UpdateAsync(${className} entity)
        {
            _context.Entry(entity).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return entity;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var entity = await GetByIdAsync(id);
            if (entity == null) return false;
            _context.${className}s.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
`;
          break;

        case 'go':
          filename = `${table.name}_repository.go`;
          path = 'repositories/';
          content = `package repositories

import (
	"gorm.io/gorm"
	"app/models"
)

type ${className}Repository struct {
	db *gorm.DB
}

func New${className}Repository(db *gorm.DB) *${className}Repository {
	return &${className}Repository{db: db}
}

func (r *${className}Repository) FindAll() ([]models.${className}, error) {
	var items []models.${className}
	result := r.db.Find(&items)
	return items, result.Error
}

func (r *${className}Repository) FindByID(id uint) (*models.${className}, error) {
	var item models.${className}
	result := r.db.First(&item, id)
	if result.Error != nil {
		return nil, result.Error
	}
	return &item, nil
}

func (r *${className}Repository) Create(item *models.${className}) error {
	return r.db.Create(item).Error
}

func (r *${className}Repository) Update(item *models.${className}) error {
	return r.db.Save(item).Error
}

func (r *${className}Repository) Delete(id uint) error {
	return r.db.Delete(&models.${className}{}, id).Error
}
`;
          break;
      }

      if (content) {
        files.push({ path, filename, content, type: 'repository' });
      }
    }

    return files;
  }

  /**
   * Generate service classes
   */
  private generateServices(
    schema: Schema,
    language: TargetLanguage,
    framework: Framework,
    packageName?: string
  ): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const pkg = packageName || 'com.app';

    for (const table of schema.tables) {
      const className = this.pascalCase(table.name);
      let content = '';
      let filename = '';
      let path = '';

      switch (language) {
        case 'java':
          filename = `${className}Service.java`;
          path = `src/main/java/${pkg.replace(/\./g, '/')}/service/`;
          content = `package ${pkg}.service;

import ${pkg}.entity.${className};
import ${pkg}.repository.${className}Repository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ${className}Service {

    @Autowired
    private ${className}Repository repository;

    public List<${className}> findAll() {
        return repository.findAll();
    }

    public Optional<${className}> findById(Long id) {
        return repository.findById(id);
    }

    public ${className} save(${className} entity) {
        return repository.save(entity);
    }

    public void deleteById(Long id) {
        repository.deleteById(id);
    }

    public boolean existsById(Long id) {
        return repository.existsById(id);
    }
}
`;
          break;

        case 'python':
          filename = `${table.name}_service.py`;
          path = 'app/services/';
          content = `from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.${table.name} import ${className}
from app.repositories.${table.name}_repository import ${className}Repository


class ${className}Service:
    def __init__(self, db: Session):
        self.repository = ${className}Repository(db)

    def get_all(self) -> List[${className}]:
        return self.repository.get_all()

    def get_by_id(self, id: int) -> Optional[${className}]:
        return self.repository.get_by_id(id)

    def create(self, data: dict) -> ${className}:
        entity = ${className}(**data)
        return self.repository.create(entity)

    def update(self, id: int, data: dict) -> Optional[${className}]:
        entity = self.get_by_id(id)
        if entity:
            for key, value in data.items():
                setattr(entity, key, value)
            return self.repository.update(entity)
        return None

    def delete(self, id: int) -> bool:
        return self.repository.delete(id)
`;
          break;

        case 'nodejs':
          filename = `${className}Service.ts`;
          path = 'src/services/';
          content = `import { ${className} } from '../entities/${className}';
import { ${this.camelCase(table.name)}Repository } from '../repositories/${className}Repository';

export class ${className}Service {
  async findAll(): Promise<${className}[]> {
    return ${this.camelCase(table.name)}Repository.findAll();
  }

  async findById(id: number): Promise<${className} | undefined> {
    return ${this.camelCase(table.name)}Repository.findById(id);
  }

  async create(data: Partial<${className}>): Promise<${className}> {
    return ${this.camelCase(table.name)}Repository.create(data);
  }

  async update(id: number, data: Partial<${className}>): Promise<${className} | undefined> {
    return ${this.camelCase(table.name)}Repository.update(id, data);
  }

  async delete(id: number): Promise<boolean> {
    return ${this.camelCase(table.name)}Repository.delete(id);
  }
}

export const ${this.camelCase(table.name)}Service = new ${className}Service();
`;
          break;

        case 'csharp':
          filename = `${className}Service.cs`;
          path = 'Services/';
          content = `using System.Collections.Generic;
using System.Threading.Tasks;
using ${pkg}.Entities;
using ${pkg}.Repositories;

namespace ${pkg}.Services
{
    public interface I${className}Service
    {
        Task<IEnumerable<${className}>> GetAllAsync();
        Task<${className}> GetByIdAsync(int id);
        Task<${className}> CreateAsync(${className} entity);
        Task<${className}> UpdateAsync(${className} entity);
        Task<bool> DeleteAsync(int id);
    }

    public class ${className}Service : I${className}Service
    {
        private readonly I${className}Repository _repository;

        public ${className}Service(I${className}Repository repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<${className}>> GetAllAsync()
        {
            return await _repository.GetAllAsync();
        }

        public async Task<${className}> GetByIdAsync(int id)
        {
            return await _repository.GetByIdAsync(id);
        }

        public async Task<${className}> CreateAsync(${className} entity)
        {
            return await _repository.CreateAsync(entity);
        }

        public async Task<${className}> UpdateAsync(${className} entity)
        {
            return await _repository.UpdateAsync(entity);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            return await _repository.DeleteAsync(id);
        }
    }
}
`;
          break;

        case 'go':
          filename = `${table.name}_service.go`;
          path = 'services/';
          content = `package services

import (
	"app/models"
	"app/repositories"
)

type ${className}Service struct {
	repo *repositories.${className}Repository
}

func New${className}Service(repo *repositories.${className}Repository) *${className}Service {
	return &${className}Service{repo: repo}
}

func (s *${className}Service) GetAll() ([]models.${className}, error) {
	return s.repo.FindAll()
}

func (s *${className}Service) GetByID(id uint) (*models.${className}, error) {
	return s.repo.FindByID(id)
}

func (s *${className}Service) Create(item *models.${className}) error {
	return s.repo.Create(item)
}

func (s *${className}Service) Update(item *models.${className}) error {
	return s.repo.Update(item)
}

func (s *${className}Service) Delete(id uint) error {
	return s.repo.Delete(id)
}
`;
          break;
      }

      if (content) {
        files.push({ path, filename, content, type: 'service' });
      }
    }

    return files;
  }

  /**
   * Generate controller classes
   */
  private generateControllers(
    schema: Schema,
    language: TargetLanguage,
    framework: Framework,
    packageName?: string
  ): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const pkg = packageName || 'com.app';

    for (const table of schema.tables) {
      const className = this.pascalCase(table.name);
      const endpoint = table.name.toLowerCase();
      let content = '';
      let filename = '';
      let path = '';

      switch (language) {
        case 'java':
          filename = `${className}Controller.java`;
          path = `src/main/java/${pkg.replace(/\./g, '/')}/controller/`;
          content = `package ${pkg}.controller;

import ${pkg}.entity.${className};
import ${pkg}.service.${className}Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/${endpoint}")
public class ${className}Controller {

    @Autowired
    private ${className}Service service;

    @GetMapping
    public List<${className}> getAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<${className}> getById(@PathVariable Long id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ${className} create(@RequestBody ${className} entity) {
        return service.save(entity);
    }

    @PutMapping("/{id}")
    public ResponseEntity<${className}> update(@PathVariable Long id, @RequestBody ${className} entity) {
        if (!service.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(service.save(entity));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!service.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        service.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
`;
          break;

        case 'python':
          filename = `${table.name}_controller.py`;
          path = 'app/controllers/';
          content = `from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.services.${table.name}_service import ${className}Service
from app.database import get_db

router = APIRouter(prefix="/${endpoint}", tags=["${className}"])


def get_service(db: Session = Depends(get_db)) -> ${className}Service:
    return ${className}Service(db)


@router.get("/")
def get_all(service: ${className}Service = Depends(get_service)):
    return service.get_all()


@router.get("/{id}")
def get_by_id(id: int, service: ${className}Service = Depends(get_service)):
    item = service.get_by_id(id)
    if not item:
        raise HTTPException(status_code=404, detail="${className} not found")
    return item


@router.post("/")
def create(data: dict, service: ${className}Service = Depends(get_service)):
    return service.create(data)


@router.put("/{id}")
def update(id: int, data: dict, service: ${className}Service = Depends(get_service)):
    item = service.update(id, data)
    if not item:
        raise HTTPException(status_code=404, detail="${className} not found")
    return item


@router.delete("/{id}")
def delete(id: int, service: ${className}Service = Depends(get_service)):
    if not service.delete(id):
        raise HTTPException(status_code=404, detail="${className} not found")
    return {"message": "Deleted successfully"}
`;
          break;

        case 'nodejs':
          filename = `${className}Controller.ts`;
          path = 'src/controllers/';
          content = `import { Request, Response } from 'express';
import { ${this.camelCase(table.name)}Service } from '../services/${className}Service';

export class ${className}Controller {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const items = await ${this.camelCase(table.name)}Service.findAll();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const item = await ${this.camelCase(table.name)}Service.findById(id);
      if (!item) {
        res.status(404).json({ error: '${className} not found' });
        return;
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const item = await ${this.camelCase(table.name)}Service.create(req.body);
      res.status(201).json(item);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const item = await ${this.camelCase(table.name)}Service.update(id, req.body);
      if (!item) {
        res.status(404).json({ error: '${className} not found' });
        return;
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const deleted = await ${this.camelCase(table.name)}Service.delete(id);
      if (!deleted) {
        res.status(404).json({ error: '${className} not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const ${this.camelCase(table.name)}Controller = new ${className}Controller();
`;
          break;

        case 'csharp':
          filename = `${className}Controller.cs`;
          path = 'Controllers/';
          content = `using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using ${pkg}.Entities;
using ${pkg}.Services;

namespace ${pkg}.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ${className}Controller : ControllerBase
    {
        private readonly I${className}Service _service;

        public ${className}Controller(I${className}Service service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<${className}>>> GetAll()
        {
            var items = await _service.GetAllAsync();
            return Ok(items);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<${className}>> GetById(int id)
        {
            var item = await _service.GetByIdAsync(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpPost]
        public async Task<ActionResult<${className}>> Create(${className} entity)
        {
            var created = await _service.CreateAsync(entity);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<${className}>> Update(int id, ${className} entity)
        {
            if (id != entity.Id) return BadRequest();
            var updated = await _service.UpdateAsync(entity);
            return Ok(updated);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await _service.DeleteAsync(id);
            if (!deleted) return NotFound();
            return NoContent();
        }
    }
}
`;
          break;

        case 'go':
          filename = `${table.name}_handler.go`;
          path = 'handlers/';
          content = `package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"app/models"
	"app/services"
)

type ${className}Handler struct {
	service *services.${className}Service
}

func New${className}Handler(service *services.${className}Service) *${className}Handler {
	return &${className}Handler{service: service}
}

func (h *${className}Handler) GetAll(c *gin.Context) {
	items, err := h.service.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *${className}Handler) GetByID(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	item, err := h.service.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "${className} not found"})
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *${className}Handler) Create(c *gin.Context) {
	var item models.${className}
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.service.Create(&item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *${className}Handler) Update(c *gin.Context) {
	var item models.${className}
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.service.Update(&item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *${className}Handler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	if err := h.service.Delete(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}
`;
          break;
      }

      if (content) {
        files.push({ path, filename, content, type: 'controller' });
      }
    }

    return files;
  }

  /**
   * Generate project structure string
   */
  private generateProjectStructure(files: GeneratedFile[]): string {
    const paths = new Set<string>();
    files.forEach(f => {
      const parts = f.path.split('/').filter(Boolean);
      let current = '';
      parts.forEach(part => {
        current += part + '/';
        paths.add(current);
      });
      paths.add(f.path + f.filename);
    });

    const sortedPaths = Array.from(paths).sort();
    let tree = '';
    sortedPaths.forEach(p => {
      const depth = (p.match(/\//g) || []).length;
      const indent = '  '.repeat(depth);
      const name = p.endsWith('/') ? p.split('/').filter(Boolean).pop() + '/' : p.split('/').pop();
      tree += `${indent}${name}\n`;
    });

    return tree;
  }

  /**
   * Generate entity/model classes
   */
  async generateEntities(
    schema: Schema,
    language: TargetLanguage,
    framework: Framework,
    options?: {
      packageName?: string;
      includeComments?: boolean;
    }
  ): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    for (const table of schema.tables) {
      const content = this.generateEntityCode(table, language, framework, options);
      const filename = this.getEntityFilename(table.name, language);
      const path = this.getEntityPath(language, framework);

      files.push({
        path,
        filename,
        content,
        type: 'entity',
      });
    }

    return files;
  }

  /**
   * Generate Prisma schema from our schema format
   */
  generatePrismaSchema(schema: Schema): string {
    let output = `// This is your Prisma schema file
// Learn more: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${this.mapDbToPrisma(schema.databaseType)}"
  url      = env("DATABASE_URL")
}

`;

    for (const table of schema.tables) {
      output += this.generatePrismaModel(table, schema);
      output += '\n';
    }

    return output;
  }

  /**
   * Generate TypeORM entities
   */
  generateTypeORMEntities(schema: Schema): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    for (const table of schema.tables) {
      const className = this.pascalCase(table.name);
      let content = `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn`;
      
      // Check for relationships
      const hasRelations = table.columns.some(c => c.references);
      if (hasRelations) {
        content += `, ManyToOne, JoinColumn`;
      }
      content += ` } from 'typeorm';\n\n`;

      content += `@Entity('${table.name}')\n`;
      content += `export class ${className} {\n`;

      for (const col of table.columns) {
        content += this.generateTypeORMColumn(col);
      }

      content += `}\n`;

      files.push({
        path: 'src/entities/',
        filename: `${className}.ts`,
        content,
        type: 'entity',
      });
    }

    return files;
  }

  /**
   * Generate SQLAlchemy models (Python)
   */
  generateSQLAlchemyModels(schema: Schema): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // Base model
    let baseContent = `from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()

def get_engine(database_url: str):
    return create_engine(database_url)

def get_session(engine):
    Session = sessionmaker(bind=engine)
    return Session()
`;

    files.push({
      path: 'app/models/',
      filename: 'base.py',
      content: baseContent,
      type: 'config',
    });

    // Generate model for each table
    for (const table of schema.tables) {
      const className = this.pascalCase(table.name);
      let content = `from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Numeric
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base


class ${className}(Base):
    __tablename__ = '${table.name}'

`;

      for (const col of table.columns) {
        content += this.generateSQLAlchemyColumn(col);
      }

      content += `
    def __repr__(self):
        return f"<${className}(id={self.id})>"

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}
`;

      files.push({
        path: 'app/models/',
        filename: `${table.name}.py`,
        content,
        type: 'entity',
      });
    }

    // __init__.py
    let initContent = `from .base import Base, get_engine, get_session\n`;
    for (const table of schema.tables) {
      const className = this.pascalCase(table.name);
      initContent += `from .${table.name} import ${className}\n`;
    }
    initContent += `\n__all__ = ['Base', 'get_engine', 'get_session'`;
    for (const table of schema.tables) {
      initContent += `, '${this.pascalCase(table.name)}'`;
    }
    initContent += `]\n`;

    files.push({
      path: 'app/models/',
      filename: '__init__.py',
      content: initContent,
      type: 'config',
    });

    return files;
  }

  /**
   * Generate Spring JPA entities (Java)
   */
  generateJPAEntities(
    schema: Schema,
    packageName: string = 'com.app'
  ): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    for (const table of schema.tables) {
      const className = this.pascalCase(table.name);
      let content = `package ${packageName}.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.math.BigDecimal;

@Entity
@Table(name = "${table.name}")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ${className} {

`;

      for (const col of table.columns) {
        content += this.generateJPAColumn(col);
      }

      content += `}
`;

      files.push({
        path: `src/main/java/${packageName.replace(/\./g, '/')}/entity/`,
        filename: `${className}.java`,
        content,
        type: 'entity',
      });
    }

    return files;
  }

  // ============ PRIVATE HELPER METHODS ============

  private generateEntityCode(
    table: Table,
    language: TargetLanguage,
    framework: Framework,
    options?: { packageName?: string; includeComments?: boolean }
  ): string {
    switch (language) {
      case 'java':
        return this.generateJavaEntity(table, framework, options?.packageName);
      case 'python':
        return this.generatePythonModel(table, framework);
      case 'nodejs':
        return this.generateTypeScriptEntity(table, framework);
      case 'csharp':
        return this.generateCSharpEntity(table, options?.packageName);
      case 'go':
        return this.generateGoStruct(table);
      default:
        return this.generateTypeScriptEntity(table, framework);
    }
  }

  private generateJavaEntity(table: Table, framework: Framework, packageName?: string): string {
    const className = this.pascalCase(table.name);
    const pkg = packageName || 'com.app';
    
    let code = `package ${pkg}.entity;\n\n`;
    code += `import jakarta.persistence.*;\n`;
    code += `import lombok.*;\n`;
    code += `import java.time.LocalDateTime;\n`;
    code += `import java.math.BigDecimal;\n\n`;
    
    code += `@Entity\n`;
    code += `@Table(name = "${table.name}")\n`;
    code += `@Data\n`;
    code += `@NoArgsConstructor\n`;
    code += `@AllArgsConstructor\n`;
    code += `@Builder\n`;
    code += `public class ${className} {\n\n`;

    for (const col of table.columns) {
      if (col.primaryKey) {
        code += `    @Id\n`;
        if (col.autoIncrement) {
          code += `    @GeneratedValue(strategy = GenerationType.IDENTITY)\n`;
        }
      }
      code += `    @Column(name = "${col.name}"`;
      if (!col.nullable) code += `, nullable = false`;
      if (col.unique) code += `, unique = true`;
      code += `)\n`;
      code += `    private ${this.mapTypeToJava(col.type)} ${this.camelCase(col.name)};\n\n`;
    }

    code += `}\n`;
    return code;
  }

  private generatePythonModel(table: Table, framework: Framework): string {
    const className = this.pascalCase(table.name);
    let code = '';

    if (framework === 'django') {
      code = `from django.db import models\n\n`;
      code += `class ${className}(models.Model):\n`;
      
      for (const col of table.columns) {
        if (col.primaryKey && col.autoIncrement) continue; // Django auto adds pk
        code += `    ${col.name} = ${this.mapTypeToDjango(col)}\n`;
      }
      
      code += `\n    class Meta:\n`;
      code += `        db_table = '${table.name}'\n`;
      code += `\n    def __str__(self):\n`;
      code += `        return str(self.pk)\n`;
    } else {
      // SQLAlchemy/FastAPI
      code = `from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Numeric\n`;
      code += `from sqlalchemy.orm import relationship\n`;
      code += `from .base import Base\n\n`;
      code += `class ${className}(Base):\n`;
      code += `    __tablename__ = '${table.name}'\n\n`;
      
      for (const col of table.columns) {
        code += `    ${col.name} = ${this.mapTypeToSQLAlchemy(col)}\n`;
      }
    }

    return code;
  }

  private generateTypeScriptEntity(table: Table, framework: Framework): string {
    const className = this.pascalCase(table.name);
    let code = '';

    if (framework === 'nestjs-typeorm') {
      code = `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';\n\n`;
      code += `@Entity('${table.name}')\n`;
      code += `export class ${className} {\n`;
      
      for (const col of table.columns) {
        code += this.generateTypeORMColumn(col);
      }
      
      code += `}\n`;
    } else {
      // Prisma or generic TypeScript
      code = `export interface ${className} {\n`;
      
      for (const col of table.columns) {
        const optional = col.nullable ? '?' : '';
        code += `  ${this.camelCase(col.name)}${optional}: ${this.mapTypeToTypeScript(col.type)};\n`;
      }
      
      code += `}\n`;
    }

    return code;
  }

  private generateCSharpEntity(table: Table, namespace?: string): string {
    const className = this.pascalCase(table.name);
    const ns = namespace || 'App.Entities';
    
    let code = `using System;\n`;
    code += `using System.ComponentModel.DataAnnotations;\n`;
    code += `using System.ComponentModel.DataAnnotations.Schema;\n\n`;
    code += `namespace ${ns}\n{\n`;
    code += `    [Table("${table.name}")]\n`;
    code += `    public class ${className}\n    {\n`;

    for (const col of table.columns) {
      if (col.primaryKey) {
        code += `        [Key]\n`;
        if (col.autoIncrement) {
          code += `        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]\n`;
        }
      }
      if (!col.nullable && !this.isValueType(col.type)) {
        code += `        [Required]\n`;
      }
      code += `        [Column("${col.name}")]\n`;
      code += `        public ${this.mapTypeToCSharp(col.type)}${col.nullable ? '?' : ''} ${this.pascalCase(col.name)} { get; set; }\n\n`;
    }

    code += `    }\n}\n`;
    return code;
  }

  private generateGoStruct(table: Table): string {
    const structName = this.pascalCase(table.name);
    
    let code = `package models\n\n`;
    code += `import (\n`;
    code += `    "time"\n`;
    code += `    "gorm.io/gorm"\n`;
    code += `)\n\n`;
    code += `type ${structName} struct {\n`;

    for (const col of table.columns) {
      const fieldName = this.pascalCase(col.name);
      const goType = this.mapTypeToGo(col.type, col.nullable);
      const jsonTag = this.camelCase(col.name);
      let gormTag = `column:${col.name}`;
      
      if (col.primaryKey) gormTag += `;primaryKey`;
      if (col.autoIncrement) gormTag += `;autoIncrement`;
      if (!col.nullable) gormTag += `;not null`;
      
      code += `    ${fieldName} ${goType} \`json:"${jsonTag}" gorm:"${gormTag}"\`\n`;
    }

    code += `}\n\n`;
    code += `func (${structName}) TableName() string {\n`;
    code += `    return "${table.name}"\n`;
    code += `}\n`;

    return code;
  }

  private generatePrismaModel(table: Table, schema: Schema): string {
    const modelName = this.pascalCase(table.name);
    let code = `model ${modelName} {\n`;

    for (const col of table.columns) {
      const fieldName = this.camelCase(col.name);
      let prismaType = this.mapTypeToPrisma(col.type);
      
      if (col.nullable && !col.primaryKey) prismaType += '?';
      
      let attributes = '';
      if (col.primaryKey) attributes += ' @id';
      if (col.autoIncrement) attributes += ' @default(autoincrement())';
      if (col.unique && !col.primaryKey) attributes += ' @unique';
      if (col.defaultValue) {
        const def = col.defaultValue.replace(/'/g, '"');
        if (def === 'CURRENT_TIMESTAMP') {
          attributes += ' @default(now())';
        } else {
          attributes += ` @default(${def})`;
        }
      }
      
      code += `  ${fieldName} ${prismaType}${attributes}\n`;
    }

    code += `\n  @@map("${table.name}")\n`;
    code += `}\n`;

    return code;
  }

  private generateTypeORMColumn(col: { name: string; type: string; primaryKey: boolean; nullable: boolean; unique: boolean; autoIncrement?: boolean }): string {
    let code = '';
    const fieldName = this.camelCase(col.name);
    
    if (col.primaryKey) {
      if (col.autoIncrement) {
        code += `  @PrimaryGeneratedColumn()\n`;
      } else {
        code += `  @PrimaryColumn()\n`;
      }
    } else {
      code += `  @Column({ `;
      const options: string[] = [];
      if (!col.nullable) options.push('nullable: false');
      if (col.unique) options.push('unique: true');
      code += options.join(', ');
      code += ` })\n`;
    }
    
    code += `  ${fieldName}: ${this.mapTypeToTypeScript(col.type)};\n\n`;
    return code;
  }

  private generateSQLAlchemyColumn(col: { name: string; type: string; primaryKey: boolean; nullable: boolean; unique: boolean; autoIncrement?: boolean; references?: { table: string; column: string } }): string {
    let code = `    ${col.name} = Column(${this.mapTypeToSQLAlchemyType(col.type)}`;
    
    if (col.primaryKey) code += ', primary_key=True';
    if (col.autoIncrement) code += ', autoincrement=True';
    if (!col.nullable && !col.primaryKey) code += ', nullable=False';
    if (col.unique && !col.primaryKey) code += ', unique=True';
    if (col.references) {
      code += `, ForeignKey('${col.references.table}.${col.references.column}')`;
    }
    
    code += ')\n';
    return code;
  }

  private generateJPAColumn(col: { name: string; type: string; primaryKey: boolean; nullable: boolean; unique: boolean; autoIncrement?: boolean }): string {
    let code = '';
    
    if (col.primaryKey) {
      code += `    @Id\n`;
      if (col.autoIncrement) {
        code += `    @GeneratedValue(strategy = GenerationType.IDENTITY)\n`;
      }
    }
    
    code += `    @Column(name = "${col.name}"`;
    if (!col.nullable) code += ', nullable = false';
    if (col.unique && !col.primaryKey) code += ', unique = true';
    code += ')\n';
    
    code += `    private ${this.mapTypeToJava(col.type)} ${this.camelCase(col.name)};\n\n`;
    return code;
  }

  // Type mapping methods
  private mapTypeToJava(type: string): string {
    const mapping: Record<string, string> = {
      'INTEGER': 'Integer', 'INT': 'Integer', 'SERIAL': 'Long', 'BIGSERIAL': 'Long',
      'BIGINT': 'Long', 'SMALLINT': 'Short',
      'VARCHAR': 'String', 'TEXT': 'String', 'CHAR': 'String',
      'BOOLEAN': 'Boolean', 'BOOL': 'Boolean',
      'TIMESTAMP': 'LocalDateTime', 'DATETIME': 'LocalDateTime', 'DATE': 'LocalDate', 'TIME': 'LocalTime',
      'DECIMAL': 'BigDecimal', 'NUMERIC': 'BigDecimal', 'FLOAT': 'Float', 'DOUBLE': 'Double', 'REAL': 'Float',
      'JSON': 'String', 'JSONB': 'String', 'UUID': 'UUID',
    };
    const upperType = type.toUpperCase().split('(')[0];
    return mapping[upperType] || 'String';
  }

  private mapTypeToTypeScript(type: string): string {
    const mapping: Record<string, string> = {
      'INTEGER': 'number', 'INT': 'number', 'SERIAL': 'number', 'BIGSERIAL': 'number',
      'BIGINT': 'number', 'SMALLINT': 'number', 'FLOAT': 'number', 'DOUBLE': 'number',
      'DECIMAL': 'number', 'NUMERIC': 'number', 'REAL': 'number',
      'VARCHAR': 'string', 'TEXT': 'string', 'CHAR': 'string', 'UUID': 'string',
      'BOOLEAN': 'boolean', 'BOOL': 'boolean',
      'TIMESTAMP': 'Date', 'DATETIME': 'Date', 'DATE': 'Date', 'TIME': 'string',
      'JSON': 'any', 'JSONB': 'any',
    };
    const upperType = type.toUpperCase().split('(')[0];
    return mapping[upperType] || 'string';
  }

  private mapTypeToPrisma(type: string): string {
    const mapping: Record<string, string> = {
      'INTEGER': 'Int', 'INT': 'Int', 'SERIAL': 'Int', 'BIGSERIAL': 'BigInt',
      'BIGINT': 'BigInt', 'SMALLINT': 'Int',
      'VARCHAR': 'String', 'TEXT': 'String', 'CHAR': 'String', 'UUID': 'String',
      'BOOLEAN': 'Boolean', 'BOOL': 'Boolean',
      'TIMESTAMP': 'DateTime', 'DATETIME': 'DateTime', 'DATE': 'DateTime', 'TIME': 'String',
      'DECIMAL': 'Decimal', 'NUMERIC': 'Decimal', 'FLOAT': 'Float', 'DOUBLE': 'Float', 'REAL': 'Float',
      'JSON': 'Json', 'JSONB': 'Json',
    };
    const upperType = type.toUpperCase().split('(')[0];
    return mapping[upperType] || 'String';
  }

  private mapTypeToCSharp(type: string): string {
    const mapping: Record<string, string> = {
      'INTEGER': 'int', 'INT': 'int', 'SERIAL': 'int', 'BIGSERIAL': 'long',
      'BIGINT': 'long', 'SMALLINT': 'short',
      'VARCHAR': 'string', 'TEXT': 'string', 'CHAR': 'string', 'UUID': 'Guid',
      'BOOLEAN': 'bool', 'BOOL': 'bool',
      'TIMESTAMP': 'DateTime', 'DATETIME': 'DateTime', 'DATE': 'DateTime', 'TIME': 'TimeSpan',
      'DECIMAL': 'decimal', 'NUMERIC': 'decimal', 'FLOAT': 'float', 'DOUBLE': 'double', 'REAL': 'float',
      'JSON': 'string', 'JSONB': 'string',
    };
    const upperType = type.toUpperCase().split('(')[0];
    return mapping[upperType] || 'string';
  }

  private mapTypeToGo(type: string, nullable: boolean): string {
    const mapping: Record<string, string> = {
      'INTEGER': 'int', 'INT': 'int', 'SERIAL': 'int64', 'BIGSERIAL': 'int64',
      'BIGINT': 'int64', 'SMALLINT': 'int16',
      'VARCHAR': 'string', 'TEXT': 'string', 'CHAR': 'string', 'UUID': 'string',
      'BOOLEAN': 'bool', 'BOOL': 'bool',
      'TIMESTAMP': 'time.Time', 'DATETIME': 'time.Time', 'DATE': 'time.Time', 'TIME': 'string',
      'DECIMAL': 'float64', 'NUMERIC': 'float64', 'FLOAT': 'float32', 'DOUBLE': 'float64', 'REAL': 'float32',
      'JSON': 'json.RawMessage', 'JSONB': 'json.RawMessage',
    };
    const upperType = type.toUpperCase().split('(')[0];
    const goType = mapping[upperType] || 'string';
    return nullable ? `*${goType}` : goType;
  }

  private mapTypeToDjango(col: { name: string; type: string; primaryKey: boolean; nullable: boolean; unique: boolean; autoIncrement?: boolean }): string {
    const type = col.type.toUpperCase().split('(')[0];
    const mapping: Record<string, string> = {
      'INTEGER': 'IntegerField', 'INT': 'IntegerField', 'SERIAL': 'AutoField', 'BIGSERIAL': 'BigAutoField',
      'BIGINT': 'BigIntegerField', 'SMALLINT': 'SmallIntegerField',
      'VARCHAR': 'CharField', 'TEXT': 'TextField', 'CHAR': 'CharField',
      'BOOLEAN': 'BooleanField', 'BOOL': 'BooleanField',
      'TIMESTAMP': 'DateTimeField', 'DATETIME': 'DateTimeField', 'DATE': 'DateField', 'TIME': 'TimeField',
      'DECIMAL': 'DecimalField', 'NUMERIC': 'DecimalField', 'FLOAT': 'FloatField', 'DOUBLE': 'FloatField',
      'JSON': 'JSONField', 'JSONB': 'JSONField', 'UUID': 'UUIDField',
    };
    
    const fieldType = mapping[type] || 'CharField';
    const options: string[] = [];
    
    if (col.nullable) options.push('null=True, blank=True');
    if (col.unique && !col.primaryKey) options.push('unique=True');
    
    // Extract length for CharField
    if (fieldType === 'CharField') {
      const match = col.type.match(/\((\d+)\)/);
      const maxLength = match ? match[1] : '255';
      options.unshift(`max_length=${maxLength}`);
    }
    
    return `models.${fieldType}(${options.join(', ')})`;
  }

  private mapTypeToSQLAlchemy(col: { name: string; type: string; primaryKey: boolean; nullable: boolean; unique: boolean; autoIncrement?: boolean }): string {
    return `Column(${this.mapTypeToSQLAlchemyType(col.type)}${col.primaryKey ? ', primary_key=True' : ''}${!col.nullable && !col.primaryKey ? ', nullable=False' : ''})`;
  }

  private mapTypeToSQLAlchemyType(type: string): string {
    const mapping: Record<string, string> = {
      'INTEGER': 'Integer', 'INT': 'Integer', 'SERIAL': 'Integer', 'BIGSERIAL': 'BigInteger',
      'BIGINT': 'BigInteger', 'SMALLINT': 'SmallInteger',
      'VARCHAR': 'String', 'TEXT': 'Text', 'CHAR': 'String',
      'BOOLEAN': 'Boolean', 'BOOL': 'Boolean',
      'TIMESTAMP': 'DateTime', 'DATETIME': 'DateTime', 'DATE': 'Date', 'TIME': 'Time',
      'DECIMAL': 'Numeric', 'NUMERIC': 'Numeric', 'FLOAT': 'Float', 'DOUBLE': 'Float',
      'JSON': 'JSON', 'JSONB': 'JSON', 'UUID': 'String(36)',
    };
    const upperType = type.toUpperCase().split('(')[0];
    const sqlType = mapping[upperType] || 'String';
    
    // Handle VARCHAR length
    if (upperType === 'VARCHAR' || upperType === 'CHAR') {
      const match = type.match(/\((\d+)\)/);
      if (match) return `String(${match[1]})`;
    }
    
    return sqlType;
  }

  private mapDbToPrisma(dbType: string): string {
    const mapping: Record<string, string> = {
      'postgresql': 'postgresql',
      'mysql': 'mysql',
      'sqlite': 'sqlite',
      'sqlserver': 'sqlserver',
      'mongodb': 'mongodb',
    };
    return mapping[dbType] || 'postgresql';
  }

  private isValueType(type: string): boolean {
    const valueTypes = ['INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'BOOLEAN', 'BOOL', 'FLOAT', 'DOUBLE', 'DECIMAL'];
    return valueTypes.includes(type.toUpperCase().split('(')[0]);
  }

  private getEntityFilename(tableName: string, language: TargetLanguage): string {
    const className = this.pascalCase(tableName);
    switch (language) {
      case 'java': return `${className}.java`;
      case 'python': return `${tableName}.py`;
      case 'nodejs': return `${className}.ts`;
      case 'csharp': return `${className}.cs`;
      case 'go': return `${tableName}.go`;
      default: return `${className}.ts`;
    }
  }

  private getEntityPath(language: TargetLanguage, framework: Framework): string {
    switch (language) {
      case 'java': return 'src/main/java/com/app/entity/';
      case 'python': return 'app/models/';
      case 'nodejs': return 'src/entities/';
      case 'csharp': return 'Entities/';
      case 'go': return 'models/';
      default: return 'src/entities/';
    }
  }

  private pascalCase(str: string): string {
    return str.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join('');
  }

  private camelCase(str: string): string {
    const pascal = this.pascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }
}

export const codeGenerator = new CodeGenerator();
