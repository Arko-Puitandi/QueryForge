import React, { useState } from 'react';
import { Button } from '../common';
import { 
  ShoppingCart, MessageSquare, Users, FileText, Heart, Building2, 
  Briefcase, Calendar, BookOpen, Database, Search, X, Check, 
  Sparkles, Layers, TrendingUp
} from 'lucide-react';

interface SchemaTemplate {
  id: string;
  name: string;
  description: string;
  category: 'ecommerce' | 'social' | 'business' | 'content' | 'saas';
  icon: React.ReactNode;
  tables: string[];
  complexity: 'simple' | 'moderate' | 'complex';
  prompt: string;
}

interface TemplatesGalleryProps {
  onSelectTemplate: (prompt: string) => void;
  onClose: () => void;
}

export const TemplatesGallery: React.FC<TemplatesGalleryProps> = ({ onSelectTemplate, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedTables, setSelectedTables] = useState<Record<string, string[]>>({});

  const templates: SchemaTemplate[] = [
    {
      id: 'ecommerce-basic',
      name: 'E-Commerce Store',
      description: 'Complete online store with products, orders, customers, and payments',
      category: 'ecommerce',
      icon: <ShoppingCart className="w-5 h-5" />,
      tables: ['users', 'products', 'categories', 'orders', 'order_items', 'payments', 'cart'],
      complexity: 'moderate',
      prompt: 'Create an e-commerce database schema with users, products with categories, shopping cart, orders with order items, and payment tracking. Include product inventory, pricing, customer addresses, and order status.'
    },
    {
      id: 'social-media',
      name: 'Social Media Platform',
      description: 'Social network with posts, comments, likes, follows, and messaging',
      category: 'social',
      icon: <MessageSquare className="w-5 h-5" />,
      tables: ['users', 'posts', 'comments', 'likes', 'follows', 'messages', 'notifications'],
      complexity: 'moderate',
      prompt: 'Create a social media platform schema with user profiles, posts with media attachments, comments and nested replies, likes, follower/following relationships, direct messaging, and real-time notifications.'
    },
    {
      id: 'blog-cms',
      name: 'Blog & CMS',
      description: 'Content management system for blogging with authors and categories',
      category: 'content',
      icon: <FileText className="w-5 h-5" />,
      tables: ['users', 'posts', 'categories', 'tags', 'comments', 'media'],
      complexity: 'simple',
      prompt: 'Create a blog CMS schema with authors, blog posts, categories, tags, comments with moderation, media library for images and files, and post revisions tracking.'
    },
    {
      id: 'crm-system',
      name: 'CRM System',
      description: 'Customer relationship management with leads, contacts, and deals',
      category: 'business',
      icon: <Users className="w-5 h-5" />,
      tables: ['contacts', 'companies', 'leads', 'deals', 'activities', 'tasks', 'notes'],
      complexity: 'complex',
      prompt: 'Create a CRM database schema with contacts, companies, sales leads with stages, deals pipeline, activities log, tasks management, notes, and email integration tracking.'
    },
    {
      id: 'project-management',
      name: 'Project Management',
      description: 'Task tracking with projects, teams, milestones, and time tracking',
      category: 'business',
      icon: <Briefcase className="w-5 h-5" />,
      tables: ['projects', 'tasks', 'users', 'teams', 'milestones', 'time_entries', 'comments'],
      complexity: 'moderate',
      prompt: 'Create a project management schema with projects, tasks with subtasks, team members and roles, milestones, time tracking, file attachments, task comments, and project status tracking.'
    },
    {
      id: 'booking-system',
      name: 'Booking & Reservation',
      description: 'Appointment scheduling with availability, bookings, and calendars',
      category: 'business',
      icon: <Calendar className="w-5 h-5" />,
      tables: ['users', 'services', 'bookings', 'availability', 'payments', 'reviews'],
      complexity: 'moderate',
      prompt: 'Create a booking system schema with service providers, services offered, customer bookings with time slots, availability calendar, payment processing, cancellation policies, and customer reviews.'
    },
    {
      id: 'learning-platform',
      name: 'Online Learning',
      description: 'E-learning with courses, lessons, quizzes, and student progress',
      category: 'content',
      icon: <BookOpen className="w-5 h-5" />,
      tables: ['users', 'courses', 'lessons', 'quizzes', 'enrollments', 'progress', 'certificates'],
      complexity: 'complex',
      prompt: 'Create an online learning platform schema with instructors, courses with modules and lessons, video content, quizzes and assignments, student enrollments, progress tracking, grades, and certificate generation.'
    },
    {
      id: 'healthcare-records',
      name: 'Healthcare System',
      description: 'Patient management with appointments, medical records, and prescriptions',
      category: 'business',
      icon: <Heart className="w-5 h-5" />,
      tables: ['patients', 'doctors', 'appointments', 'medical_records', 'prescriptions', 'lab_results'],
      complexity: 'complex',
      prompt: 'Create a healthcare management schema with patient records, doctor profiles, appointment scheduling, medical history, prescriptions, lab test results, billing, and insurance information.'
    },
    {
      id: 'real-estate',
      name: 'Real Estate Platform',
      description: 'Property listings with agents, viewings, and offers',
      category: 'business',
      icon: <Building2 className="w-5 h-5" />,
      tables: ['properties', 'agents', 'clients', 'viewings', 'offers', 'contracts'],
      complexity: 'moderate',
      prompt: 'Create a real estate database schema with property listings, real estate agents, clients (buyers/sellers), scheduled viewings, offers and negotiations, contracts, and property features/amenities.'
    },
    {
      id: 'saas-subscription',
      name: 'SaaS Platform',
      description: 'Multi-tenant SaaS with subscriptions, billing, and usage tracking',
      category: 'saas',
      icon: <Database className="w-5 h-5" />,
      tables: ['tenants', 'users', 'subscriptions', 'plans', 'invoices', 'usage_metrics', 'features'],
      complexity: 'complex',
      prompt: 'Create a SaaS platform schema with multi-tenancy support, user management with roles, subscription plans with tiers, billing and invoices, usage tracking and quotas, feature flags, and API keys.'
    }
  ];

  const categories = [
    { id: 'all', label: 'All', icon: <Layers className="w-4 h-4" />, count: templates.length },
    { id: 'ecommerce', label: 'E-Commerce', icon: <ShoppingCart className="w-4 h-4" />, count: templates.filter(t => t.category === 'ecommerce').length },
    { id: 'social', label: 'Social', icon: <MessageSquare className="w-4 h-4" />, count: templates.filter(t => t.category === 'social').length },
    { id: 'business', label: 'Business', icon: <Briefcase className="w-4 h-4" />, count: templates.filter(t => t.category === 'business').length },
    { id: 'content', label: 'Content', icon: <FileText className="w-4 h-4" />, count: templates.filter(t => t.category === 'content').length },
    { id: 'saas', label: 'SaaS', icon: <TrendingUp className="w-4 h-4" />, count: templates.filter(t => t.category === 'saas').length }
  ];

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getComplexityBadge = (complexity: string) => {
    const styles = {
      simple: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
      moderate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
      complex: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800'
    };
    return styles[complexity as keyof typeof styles] || styles.simple;
  };

  const handleUseTemplate = (template: SchemaTemplate) => {
    const selectedTablesList = selectedTables[template.id] || [];
    let finalPrompt = template.prompt;
    
    if (selectedTablesList.length > 0 && selectedTablesList.length < template.tables.length) {
      finalPrompt = `${template.prompt} Focus on these tables: ${selectedTablesList.join(', ')}.`;
    }
    
    onSelectTemplate(finalPrompt);
    onClose();
  };

  const toggleTableSelection = (templateId: string, table: string) => {
    setSelectedTables(prev => {
      const current = prev[templateId] || [];
      if (current.includes(table)) {
        return { ...prev, [templateId]: current.filter(t => t !== table) };
      }
      return { ...prev, [templateId]: [...current, table] };
    });
  };

  const selectAllTables = (templateId: string, tables: string[]) => {
    setSelectedTables(prev => ({ ...prev, [templateId]: tables }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-7xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="relative px-8 py-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Schema Templates</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                Choose from {templates.length} professional templates to get started quickly
              </p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="px-8 py-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>

            {/* Category Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                    selectedCategory === category.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {category.icon}
                  <span>{category.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-xs ${
                    selectedCategory === category.id
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {category.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-8">
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Database className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4" />
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400">No templates found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => {
                const isExpanded = selectedTemplate === template.id;
                const selectedTablesList = selectedTables[template.id] || [];

                return (
                  <div
                    key={template.id}
                    className={`group relative rounded-2xl border transition-all duration-300 ${
                      isExpanded
                        ? 'ring-2 ring-blue-500 border-blue-500 shadow-xl shadow-blue-500/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg'
                    } bg-white dark:bg-gray-800 overflow-hidden`}
                  >
                    {/* Template Header */}
                    <div className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white flex-shrink-0 shadow-lg shadow-blue-500/30">
                          {template.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
                            {template.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {template.description}
                          </p>
                        </div>
                      </div>

                      {/* Meta Info */}
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${getComplexityBadge(template.complexity)}`}>
                          {template.complexity}
                        </span>
                        <span className="px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                          {template.tables.length} tables
                        </span>
                      </div>

                      {/* Tables List */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Tables ({template.tables.length})
                          </span>
                          {isExpanded && (
                            <button
                              onClick={() => {
                                if (selectedTablesList.length === template.tables.length) {
                                  setSelectedTables(prev => ({ ...prev, [template.id]: [] }));
                                } else {
                                  selectAllTables(template.id, template.tables);
                                }
                              }}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                            >
                              {selectedTablesList.length === template.tables.length ? 'Deselect All' : 'Select All'}
                            </button>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-1.5">
                          {template.tables.slice(0, isExpanded ? undefined : 5).map((table) => {
                            const isSelected = selectedTablesList.includes(table);
                            return (
                              <button
                                key={table}
                                onClick={() => {
                                  if (!isExpanded) {
                                    setSelectedTemplate(template.id);
                                  } else {
                                    toggleTableSelection(template.id, table);
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                                  isExpanded && isSelected
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-700'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                              >
                                {isExpanded && isSelected && <Check className="w-3 h-3 inline mr-1" />}
                                {table}
                              </button>
                            );
                          })}
                          {!isExpanded && template.tables.length > 5 && (
                            <button
                              onClick={() => setSelectedTemplate(template.id)}
                              className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                              +{template.tables.length - 5} more
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        onClick={() => handleUseTemplate(template)}
                        className="w-full"
                        size="sm"
                      >
                        {selectedTablesList.length > 0 && selectedTablesList.length < template.tables.length
                          ? `Use ${selectedTablesList.length} Selected Tables`
                          : 'Use This Template'
                        }
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Select a template to auto-fill your schema description • Click on table names to customize selection
          </p>
        </div>
      </div>
    </div>
  );
};
