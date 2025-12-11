import { SchemaTemplate, Schema, DatabaseType } from '../../types/index.js';

const templates: SchemaTemplate[] = [
  {
    id: 'employee-management',
    name: 'Employee Management System',
    description: 'Complete HR/Employee management system with departments, employees, salaries, and attendance tracking',
    category: 'Business',
    tags: ['hr', 'employee', 'payroll', 'attendance'],
    schema: {
      name: 'employee_management',
      tables: [
        {
          name: 'departments',
          columns: [
            { name: 'id', type: 'SERIAL', primaryKey: true, nullable: false, unique: true, autoIncrement: true },
            { name: 'name', type: 'VARCHAR(100)', primaryKey: false, nullable: false, unique: true },
            { name: 'code', type: 'VARCHAR(10)', primaryKey: false, nullable: false, unique: true },
            { name: 'description', type: 'TEXT', primaryKey: false, nullable: true, unique: false },
            { name: 'manager_id', type: 'INTEGER', primaryKey: false, nullable: true, unique: false },
            { name: 'created_at', type: 'TIMESTAMP', primaryKey: false, nullable: false, unique: false, defaultValue: 'CURRENT_TIMESTAMP' },
            { name: 'updated_at', type: 'TIMESTAMP', primaryKey: false, nullable: false, unique: false, defaultValue: 'CURRENT_TIMESTAMP' },
          ],
          indexes: [{ name: 'idx_dept_code', columns: ['code'], unique: true }],
          primaryKey: ['id'],
        },
        {
          name: 'employees',
          columns: [
            { name: 'id', type: 'SERIAL', primaryKey: true, nullable: false, unique: true, autoIncrement: true },
            { name: 'employee_code', type: 'VARCHAR(20)', primaryKey: false, nullable: false, unique: true },
            { name: 'first_name', type: 'VARCHAR(50)', primaryKey: false, nullable: false, unique: false },
            { name: 'last_name', type: 'VARCHAR(50)', primaryKey: false, nullable: false, unique: false },
            { name: 'email', type: 'VARCHAR(100)', primaryKey: false, nullable: false, unique: true },
            { name: 'phone', type: 'VARCHAR(20)', primaryKey: false, nullable: true, unique: false },
            { name: 'department_id', type: 'INTEGER', primaryKey: false, nullable: false, unique: false, references: { table: 'departments', column: 'id', onDelete: 'RESTRICT' } },
            { name: 'position', type: 'VARCHAR(100)', primaryKey: false, nullable: false, unique: false },
            { name: 'hire_date', type: 'DATE', primaryKey: false, nullable: false, unique: false },
            { name: 'salary', type: 'DECIMAL(12,2)', primaryKey: false, nullable: false, unique: false },
            { name: 'status', type: 'VARCHAR(20)', primaryKey: false, nullable: false, unique: false, defaultValue: "'active'" },
            { name: 'created_at', type: 'TIMESTAMP', primaryKey: false, nullable: false, unique: false, defaultValue: 'CURRENT_TIMESTAMP' },
            { name: 'updated_at', type: 'TIMESTAMP', primaryKey: false, nullable: false, unique: false, defaultValue: 'CURRENT_TIMESTAMP' },
          ],
          indexes: [
            { name: 'idx_emp_code', columns: ['employee_code'], unique: true },
            { name: 'idx_emp_email', columns: ['email'], unique: true },
            { name: 'idx_emp_dept', columns: ['department_id'], unique: false },
          ],
          primaryKey: ['id'],
        },
        {
          name: 'salaries',
          columns: [
            { name: 'id', type: 'SERIAL', primaryKey: true, nullable: false, unique: true, autoIncrement: true },
            { name: 'employee_id', type: 'INTEGER', primaryKey: false, nullable: false, unique: false, references: { table: 'employees', column: 'id', onDelete: 'CASCADE' } },
            { name: 'amount', type: 'DECIMAL(12,2)', primaryKey: false, nullable: false, unique: false },
            { name: 'effective_date', type: 'DATE', primaryKey: false, nullable: false, unique: false },
            { name: 'end_date', type: 'DATE', primaryKey: false, nullable: true, unique: false },
            { name: 'created_at', type: 'TIMESTAMP', primaryKey: false, nullable: false, unique: false, defaultValue: 'CURRENT_TIMESTAMP' },
          ],
          indexes: [{ name: 'idx_salary_emp', columns: ['employee_id'], unique: false }],
          primaryKey: ['id'],
        },
        {
          name: 'attendance',
          columns: [
            { name: 'id', type: 'SERIAL', primaryKey: true, nullable: false, unique: true, autoIncrement: true },
            { name: 'employee_id', type: 'INTEGER', primaryKey: false, nullable: false, unique: false, references: { table: 'employees', column: 'id', onDelete: 'CASCADE' } },
            { name: 'date', type: 'DATE', primaryKey: false, nullable: false, unique: false },
            { name: 'check_in', type: 'TIME', primaryKey: false, nullable: true, unique: false },
            { name: 'check_out', type: 'TIME', primaryKey: false, nullable: true, unique: false },
            { name: 'status', type: 'VARCHAR(20)', primaryKey: false, nullable: false, unique: false },
            { name: 'notes', type: 'TEXT', primaryKey: false, nullable: true, unique: false },
          ],
          indexes: [
            { name: 'idx_attendance_emp_date', columns: ['employee_id', 'date'], unique: true },
          ],
          primaryKey: ['id'],
        },
      ],
      relationships: [
        { name: 'emp_dept', fromTable: 'employees', fromColumn: 'department_id', toTable: 'departments', toColumn: 'id', type: 'many-to-one' as const },
        { name: 'dept_manager', fromTable: 'departments', fromColumn: 'manager_id', toTable: 'employees', toColumn: 'id', type: 'one-to-one' as const },
        { name: 'emp_salaries', fromTable: 'salaries', fromColumn: 'employee_id', toTable: 'employees', toColumn: 'id', type: 'many-to-one' as const },
        { name: 'emp_attendance', fromTable: 'attendance', fromColumn: 'employee_id', toTable: 'employees', toColumn: 'id', type: 'many-to-one' as const },
      ],
    },
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce Platform',
    description: 'Full e-commerce system with products, categories, orders, customers, and payments',
    category: 'Business',
    tags: ['ecommerce', 'shop', 'orders', 'products'],
    schema: {
      name: 'ecommerce',
      tables: [
        {
          name: 'categories',
          columns: [
            { name: 'id', type: 'SERIAL', primaryKey: true, nullable: false, unique: true, autoIncrement: true },
            { name: 'name', type: 'VARCHAR(100)', primaryKey: false, nullable: false, unique: false },
            { name: 'slug', type: 'VARCHAR(100)', primaryKey: false, nullable: false, unique: true },
            { name: 'description', type: 'TEXT', primaryKey: false, nullable: true, unique: false },
            { name: 'parent_id', type: 'INTEGER', primaryKey: false, nullable: true, unique: false },
            { name: 'image_url', type: 'VARCHAR(255)', primaryKey: false, nullable: true, unique: false },
            { name: 'is_active', type: 'BOOLEAN', primaryKey: false, nullable: false, unique: false, defaultValue: 'true' },
            { name: 'created_at', type: 'TIMESTAMP', primaryKey: false, nullable: false, unique: false, defaultValue: 'CURRENT_TIMESTAMP' },
          ],
          indexes: [{ name: 'idx_cat_slug', columns: ['slug'], unique: true }],
          primaryKey: ['id'],
        },
        {
          name: 'products',
          columns: [
            { name: 'id', type: 'SERIAL', primaryKey: true, nullable: false, unique: true, autoIncrement: true },
            { name: 'sku', type: 'VARCHAR(50)', primaryKey: false, nullable: false, unique: true },
            { name: 'name', type: 'VARCHAR(200)', primaryKey: false, nullable: false, unique: false },
            { name: 'slug', type: 'VARCHAR(200)', primaryKey: false, nullable: false, unique: true },
            { name: 'description', type: 'TEXT', primaryKey: false, nullable: true, unique: false },
            { name: 'price', type: 'DECIMAL(10,2)', primaryKey: false, nullable: false, unique: false },
            { name: 'compare_price', type: 'DECIMAL(10,2)', primaryKey: false, nullable: true, unique: false },
            { name: 'cost_price', type: 'DECIMAL(10,2)', primaryKey: false, nullable: true, unique: false },
            { name: 'category_id', type: 'INTEGER', primaryKey: false, nullable: false, unique: false, references: { table: 'categories', column: 'id' } },
            { name: 'stock_quantity', type: 'INTEGER', primaryKey: false, nullable: false, unique: false, defaultValue: '0' },
            { name: 'is_active', type: 'BOOLEAN', primaryKey: false, nullable: false, unique: false, defaultValue: 'true' },
            { name: 'created_at', type: 'TIMESTAMP', primaryKey: false, nullable: false, unique: false, defaultValue: 'CURRENT_TIMESTAMP' },
            { name: 'updated_at', type: 'TIMESTAMP', primaryKey: false, nullable: false, unique: false, defaultValue: 'CURRENT_TIMESTAMP' },
          ],
          indexes: [
            { name: 'idx_prod_sku', columns: ['sku'], unique: true },
            { name: 'idx_prod_cat', columns: ['category_id'], unique: false },
          ],
          primaryKey: ['id'],
        },
        {
          name: 'customers',
          columns: [
            { name: 'id', type: 'SERIAL', primaryKey: true, nullable: false, unique: true, autoIncrement: true },
            { name: 'email', type: 'VARCHAR(100)', primaryKey: false, nullable: false, unique: true },
            { name: 'password_hash', type: 'VARCHAR(255)', primaryKey: false, nullable: false, unique: false },
            { name: 'first_name', type: 'VARCHAR(50)', primaryKey: false, nullable: false, unique: false },
            { name: 'last_name', type: 'VARCHAR(50)', primaryKey: false, nullable: false, unique: false },
            { name: 'phone', type: 'VARCHAR(20)', primaryKey: false, nullable: true, unique: false },
            { name: 'is_active', type: 'BOOLEAN', primaryKey: false, nullable: false, unique: false, defaultValue: 'true' },
            { name: 'created_at', type: 'TIMESTAMP', primaryKey: false, nullable: false, unique: false, defaultValue: 'CURRENT_TIMESTAMP' },
          ],
          indexes: [{ name: 'idx_cust_email', columns: ['email'], unique: true }],
          primaryKey: ['id'],
        },
        {
          name: 'orders',
          columns: [
            { name: 'id', type: 'SERIAL', primaryKey: true, nullable: false, unique: true, autoIncrement: true },
            { name: 'order_number', type: 'VARCHAR(50)', primaryKey: false, nullable: false, unique: true },
            { name: 'customer_id', type: 'INTEGER', primaryKey: false, nullable: false, unique: false, references: { table: 'customers', column: 'id' } },
            { name: 'status', type: 'VARCHAR(30)', primaryKey: false, nullable: false, unique: false, defaultValue: "'pending'" },
            { name: 'subtotal', type: 'DECIMAL(10,2)', primaryKey: false, nullable: false, unique: false },
            { name: 'tax', type: 'DECIMAL(10,2)', primaryKey: false, nullable: false, unique: false, defaultValue: '0' },
            { name: 'shipping', type: 'DECIMAL(10,2)', primaryKey: false, nullable: false, unique: false, defaultValue: '0' },
            { name: 'total', type: 'DECIMAL(10,2)', primaryKey: false, nullable: false, unique: false },
            { name: 'shipping_address', type: 'JSON', primaryKey: false, nullable: true, unique: false },
            { name: 'billing_address', type: 'JSON', primaryKey: false, nullable: true, unique: false },
            { name: 'notes', type: 'TEXT', primaryKey: false, nullable: true, unique: false },
            { name: 'created_at', type: 'TIMESTAMP', primaryKey: false, nullable: false, unique: false, defaultValue: 'CURRENT_TIMESTAMP' },
            { name: 'updated_at', type: 'TIMESTAMP', primaryKey: false, nullable: false, unique: false, defaultValue: 'CURRENT_TIMESTAMP' },
          ],
          indexes: [
            { name: 'idx_order_num', columns: ['order_number'], unique: true },
            { name: 'idx_order_cust', columns: ['customer_id'], unique: false },
          ],
          primaryKey: ['id'],
        },
        {
          name: 'order_items',
          columns: [
            { name: 'id', type: 'SERIAL', primaryKey: true, nullable: false, unique: true, autoIncrement: true },
            { name: 'order_id', type: 'INTEGER', primaryKey: false, nullable: false, unique: false, references: { table: 'orders', column: 'id', onDelete: 'CASCADE' } },
            { name: 'product_id', type: 'INTEGER', primaryKey: false, nullable: false, unique: false, references: { table: 'products', column: 'id' } },
            { name: 'quantity', type: 'INTEGER', primaryKey: false, nullable: false, unique: false },
            { name: 'price', type: 'DECIMAL(10,2)', primaryKey: false, nullable: false, unique: false },
            { name: 'total', type: 'DECIMAL(10,2)', primaryKey: false, nullable: false, unique: false },
          ],
          indexes: [{ name: 'idx_oi_order', columns: ['order_id'], unique: false }],
          primaryKey: ['id'],
        },
      ],
      relationships: [
        { name: 'prod_cat', fromTable: 'products', fromColumn: 'category_id', toTable: 'categories', toColumn: 'id', type: 'many-to-one' as const },
        { name: 'order_cust', fromTable: 'orders', fromColumn: 'customer_id', toTable: 'customers', toColumn: 'id', type: 'many-to-one' as const },
        { name: 'oi_order', fromTable: 'order_items', fromColumn: 'order_id', toTable: 'orders', toColumn: 'id', type: 'many-to-one' as const },
        { name: 'oi_prod', fromTable: 'order_items', fromColumn: 'product_id', toTable: 'products', toColumn: 'id', type: 'many-to-one' as const },
      ],
    },
  },
  {
    id: 'blog-cms',
    name: 'Blog/CMS Platform',
    description: 'Content management system with posts, categories, tags, comments, and users',
    category: 'Content',
    tags: ['blog', 'cms', 'content', 'articles'],
    schema: {
      name: 'blog_cms',
      tables: [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'SERIAL', primaryKey: true, nullable: false, unique: true, autoIncrement: true },
            { name: 'username', type: 'VARCHAR(50)', primaryKey: false, nullable: false, unique: true },
            { name: 'email', type: 'VARCHAR(100)', primaryKey: false, nullable: false, unique: true },
            { name: 'password_hash', type: 'VARCHAR(255)', primaryKey: false, nullable: false, unique: false },
            { name: 'display_name', type: 'VARCHAR(100)', primaryKey: false, nullable: false, unique: false },
            { name: 'bio', type: 'TEXT', primaryKey: false, nullable: true, unique: false },
            { name: 'avatar_url', type: 'VARCHAR(255)', primaryKey: false, nullable: true, unique: false },
            { name: 'role', type: 'VARCHAR(20)', primaryKey: false, nullable: false, unique: false, defaultValue: "'author'" },
            { name: 'is_active', type: 'BOOLEAN', primaryKey: false, nullable: false, unique: false, defaultValue: 'true' },
            { name: 'created_at', type: 'TIMESTAMP', primaryKey: false, nullable: false, unique: false, defaultValue: 'CURRENT_TIMESTAMP' },
          ],
          indexes: [
            { name: 'idx_user_email', columns: ['email'], unique: true },
            { name: 'idx_user_username', columns: ['username'], unique: true },
          ],
          primaryKey: ['id'],
        },
        {
          name: 'categories',
          columns: [
            { name: 'id', type: 'SERIAL', primaryKey: true, nullable: false, unique: true, autoIncrement: true },
            { name: 'name', type: 'VARCHAR(100)', primaryKey: false, nullable: false, unique: false },
            { name: 'slug', type: 'VARCHAR(100)', primaryKey: false, nullable: false, unique: true },
            { name: 'description', type: 'TEXT', primaryKey: false, nullable: true, unique: false },
          ],
          indexes: [{ name: 'idx_blog_cat_slug', columns: ['slug'], unique: true }],
          primaryKey: ['id'],
        },
        {
          name: 'tags',
          columns: [
            { name: 'id', type: 'SERIAL', primaryKey: true, nullable: false, unique: true, autoIncrement: true },
            { name: 'name', type: 'VARCHAR(50)', primaryKey: false, nullable: false, unique: false },
            { name: 'slug', type: 'VARCHAR(50)', primaryKey: false, nullable: false, unique: true },
          ],
          indexes: [{ name: 'idx_tag_slug', columns: ['slug'], unique: true }],
          primaryKey: ['id'],
        },
        {
          name: 'posts',
          columns: [
            { name: 'id', type: 'SERIAL', primaryKey: true, nullable: false, unique: true, autoIncrement: true },
            { name: 'title', type: 'VARCHAR(255)', primaryKey: false, nullable: false, unique: false },
            { name: 'slug', type: 'VARCHAR(255)', primaryKey: false, nullable: false, unique: true },
            { name: 'content', type: 'TEXT', primaryKey: false, nullable: false, unique: false },
            { name: 'excerpt', type: 'TEXT', primaryKey: false, nullable: true, unique: false },
            { name: 'featured_image', type: 'VARCHAR(255)', primaryKey: false, nullable: true, unique: false },
            { name: 'author_id', type: 'INTEGER', primaryKey: false, nullable: false, unique: false, references: { table: 'users', column: 'id' } },
            { name: 'category_id', type: 'INTEGER', primaryKey: false, nullable: false, unique: false, references: { table: 'categories', column: 'id' } },
            { name: 'status', type: 'VARCHAR(20)', primaryKey: false, nullable: false, unique: false, defaultValue: "'draft'" },
            { name: 'view_count', type: 'INTEGER', primaryKey: false, nullable: false, unique: false, defaultValue: '0' },
            { name: 'published_at', type: 'TIMESTAMP', primaryKey: false, nullable: true, unique: false },
            { name: 'created_at', type: 'TIMESTAMP', primaryKey: false, nullable: false, unique: false, defaultValue: 'CURRENT_TIMESTAMP' },
            { name: 'updated_at', type: 'TIMESTAMP', primaryKey: false, nullable: false, unique: false, defaultValue: 'CURRENT_TIMESTAMP' },
          ],
          indexes: [
            { name: 'idx_post_slug', columns: ['slug'], unique: true },
            { name: 'idx_post_author', columns: ['author_id'], unique: false },
            { name: 'idx_post_cat', columns: ['category_id'], unique: false },
          ],
          primaryKey: ['id'],
        },
        {
          name: 'post_tags',
          columns: [
            { name: 'post_id', type: 'INTEGER', primaryKey: true, nullable: false, unique: false, references: { table: 'posts', column: 'id', onDelete: 'CASCADE' } },
            { name: 'tag_id', type: 'INTEGER', primaryKey: true, nullable: false, unique: false, references: { table: 'tags', column: 'id', onDelete: 'CASCADE' } },
          ],
          indexes: [],
          primaryKey: ['post_id', 'tag_id'],
        },
        {
          name: 'comments',
          columns: [
            { name: 'id', type: 'SERIAL', primaryKey: true, nullable: false, unique: true, autoIncrement: true },
            { name: 'post_id', type: 'INTEGER', primaryKey: false, nullable: false, unique: false, references: { table: 'posts', column: 'id', onDelete: 'CASCADE' } },
            { name: 'user_id', type: 'INTEGER', primaryKey: false, nullable: true, unique: false, references: { table: 'users', column: 'id' } },
            { name: 'author_name', type: 'VARCHAR(100)', primaryKey: false, nullable: true, unique: false },
            { name: 'author_email', type: 'VARCHAR(100)', primaryKey: false, nullable: true, unique: false },
            { name: 'content', type: 'TEXT', primaryKey: false, nullable: false, unique: false },
            { name: 'parent_id', type: 'INTEGER', primaryKey: false, nullable: true, unique: false },
            { name: 'status', type: 'VARCHAR(20)', primaryKey: false, nullable: false, unique: false, defaultValue: "'pending'" },
            { name: 'created_at', type: 'TIMESTAMP', primaryKey: false, nullable: false, unique: false, defaultValue: 'CURRENT_TIMESTAMP' },
          ],
          indexes: [{ name: 'idx_comment_post', columns: ['post_id'], unique: false }],
          primaryKey: ['id'],
        },
      ],
      relationships: [
        { name: 'post_author', fromTable: 'posts', fromColumn: 'author_id', toTable: 'users', toColumn: 'id', type: 'many-to-one' as const },
        { name: 'post_category', fromTable: 'posts', fromColumn: 'category_id', toTable: 'categories', toColumn: 'id', type: 'many-to-one' as const },
        { name: 'post_tags', fromTable: 'post_tags', fromColumn: 'post_id', toTable: 'posts', toColumn: 'id', type: 'many-to-many' as const },
        { name: 'comment_post', fromTable: 'comments', fromColumn: 'post_id', toTable: 'posts', toColumn: 'id', type: 'many-to-one' as const },
      ],
    },
  },
];

export const schemaTemplates = {
  getAll(): SchemaTemplate[] {
    return templates;
  },

  getById(id: string): SchemaTemplate | undefined {
    return templates.find(t => t.id === id);
  },

  getByCategory(category: string): SchemaTemplate[] {
    return templates.filter(t => t.category === category);
  },

  search(query: string): SchemaTemplate[] {
    const lower = query.toLowerCase();
    return templates.filter(t =>
      t.name.toLowerCase().includes(lower) ||
      t.description.toLowerCase().includes(lower) ||
      t.tags.some(tag => tag.toLowerCase().includes(lower))
    );
  },

  getCategories(): string[] {
    return [...new Set(templates.map(t => t.category))];
  },
};
