import { describe, it, expect } from 'vitest'
import { 
  exampleTemplates, 
  getTemplateById, 
  getDefaultTemplate,
  type ExampleTemplate 
} from '../exampleTemplates'

describe('exampleTemplates', () => {
  describe('Template Structure', () => {
    it('should have at least 5 templates', () => {
      expect(exampleTemplates.length).toBeGreaterThanOrEqual(5)
    })

    it('should have all required fields for each template', () => {
      exampleTemplates.forEach((template: ExampleTemplate) => {
        expect(template).toHaveProperty('id')
        expect(template).toHaveProperty('name')
        expect(template).toHaveProperty('icon')
        expect(template).toHaveProperty('description')
        expect(template).toHaveProperty('content')
        
        expect(typeof template.id).toBe('string')
        expect(typeof template.name).toBe('string')
        expect(typeof template.icon).toBe('string')
        expect(typeof template.description).toBe('string')
        expect(typeof template.content).toBe('string')
      })
    })

    it('should have unique IDs for each template', () => {
      const ids = exampleTemplates.map(t => t.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(exampleTemplates.length)
    })

    it('should have non-empty content for each template', () => {
      exampleTemplates.forEach((template: ExampleTemplate) => {
        expect(template.content.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Template Content Validation', () => {
    it('showcase template should include comprehensive features', () => {
      const showcase = exampleTemplates.find(t => t.id === 'showcase')
      expect(showcase).toBeDefined()
      
      if (showcase) {
        // Check for various HTML elements
        expect(showcase.content).toContain('<h1>')
        expect(showcase.content).toContain('<h2>')
        expect(showcase.content).toContain('<h3>')
        expect(showcase.content).toContain('<p>')
        expect(showcase.content).toContain('<ul>')
        expect(showcase.content).toContain('<ol>')
        expect(showcase.content).toContain('<strong>')
        expect(showcase.content).toContain('<em>')
        expect(showcase.content).toContain('<code>')
        expect(showcase.content).toContain('<pre>')
        expect(showcase.content).toContain('<blockquote>')
        expect(showcase.content).toContain('<hr>')
        expect(showcase.content).toContain('<a href')
        
        // Check for feature mentions
        expect(showcase.content).toContain('CKEditor')
        expect(showcase.content).toContain('Notion')
        expect(showcase.content).toContain('Medium')
      }
    })

    it('blog-post template should have proper article structure', () => {
      const blogPost = exampleTemplates.find(t => t.id === 'blog-post')
      expect(blogPost).toBeDefined()
      
      if (blogPost) {
        expect(blogPost.content).toContain('<h1>')
        expect(blogPost.content).toContain('Published on')
        expect(blogPost.content).toContain('min read')
        expect(blogPost.content).toContain('<h2>')
        expect(blogPost.content).toContain('<pre><code')
        expect(blogPost.content).toContain('language-javascript')
      }
    })

    it('documentation template should have technical content', () => {
      const docs = exampleTemplates.find(t => t.id === 'documentation')
      expect(docs).toBeDefined()
      
      if (docs) {
        expect(docs.content).toContain('API')
        expect(docs.content).toContain('<table>')
        expect(docs.content).toContain('<thead>')
        expect(docs.content).toContain('<tbody>')
        expect(docs.content).toContain('<code>')
        expect(docs.content).toContain('POST')
      }
    })

    it('meeting-notes template should have structured format', () => {
      const notes = exampleTemplates.find(t => t.id === 'meeting-notes')
      expect(notes).toBeDefined()
      
      if (notes) {
        expect(notes.content).toContain('Date:')
        expect(notes.content).toContain('Attendees')
        expect(notes.content).toContain('Agenda')
        expect(notes.content).toContain('<table>')
        expect(notes.content).toContain('Action Items')
      }
    })

    it('simple template should have minimal content', () => {
      const simple = exampleTemplates.find(t => t.id === 'simple')
      expect(simple).toBeDefined()
      
      if (simple) {
        expect(simple.content.length).toBeLessThan(500)
        expect(simple.content).toContain('<h2>')
        expect(simple.content).toContain('<p>')
      }
    })
  })

  describe('getTemplateById', () => {
    it('should return correct template by ID', () => {
      const showcase = getTemplateById('showcase')
      expect(showcase).toBeDefined()
      expect(showcase?.id).toBe('showcase')
      expect(showcase?.name).toBe('Feature Showcase')
    })

    it('should return undefined for non-existent ID', () => {
      const result = getTemplateById('non-existent-id')
      expect(result).toBeUndefined()
    })

    it('should return correct template for each valid ID', () => {
      const validIds = ['showcase', 'blog-post', 'documentation', 'meeting-notes', 'simple']
      
      validIds.forEach(id => {
        const template = getTemplateById(id)
        expect(template).toBeDefined()
        expect(template?.id).toBe(id)
      })
    })
  })

  describe('getDefaultTemplate', () => {
    it('should return the showcase template as default', () => {
      const defaultTemplate = getDefaultTemplate()
      expect(defaultTemplate).toBeDefined()
      expect(defaultTemplate.id).toBe('showcase')
    })

    it('should return a template with all required fields', () => {
      const defaultTemplate = getDefaultTemplate()
      expect(defaultTemplate).toHaveProperty('id')
      expect(defaultTemplate).toHaveProperty('name')
      expect(defaultTemplate).toHaveProperty('icon')
      expect(defaultTemplate).toHaveProperty('description')
      expect(defaultTemplate).toHaveProperty('content')
    })

    it('should return a template with substantial content', () => {
      const defaultTemplate = getDefaultTemplate()
      expect(defaultTemplate.content.length).toBeGreaterThan(1000)
    })
  })

  describe('Template Icons', () => {
    it('should have emoji icons for visual identification', () => {
      exampleTemplates.forEach((template: ExampleTemplate) => {
        expect(template.icon.length).toBeGreaterThan(0)
        // Emojis typically have length 1-2 in JavaScript
        expect(template.icon.length).toBeLessThan(5)
      })
    })

    it('should have unique icons for better UX', () => {
      const icons = exampleTemplates.map(t => t.icon)
      const uniqueIcons = new Set(icons)
      expect(uniqueIcons.size).toBe(exampleTemplates.length)
    })
  })

  describe('Template Descriptions', () => {
    it('should have descriptive text for each template', () => {
      exampleTemplates.forEach((template: ExampleTemplate) => {
        expect(template.description.length).toBeGreaterThan(10)
        expect(template.description.length).toBeLessThan(100)
      })
    })

    it('should have different descriptions for each template', () => {
      const descriptions = exampleTemplates.map(t => t.description)
      const uniqueDescriptions = new Set(descriptions)
      expect(uniqueDescriptions.size).toBe(exampleTemplates.length)
    })
  })

  describe('HTML Validity', () => {
    it('should not have dangerous HTML in templates', () => {
      exampleTemplates.forEach((template: ExampleTemplate) => {
        // Check for potentially dangerous elements
        expect(template.content).not.toContain('<script')
        expect(template.content).not.toContain('javascript:')
        expect(template.content).not.toContain('onerror=')
        expect(template.content).not.toContain('onclick=')
      })
    })
  })

  describe('Content Quality', () => {
    it('showcase template should be the most comprehensive', () => {
      const showcase = getTemplateById('showcase')
      const simple = getTemplateById('simple')
      
      if (showcase && simple) {
        expect(showcase.content.length).toBeGreaterThan(simple.content.length * 5)
      }
    })

    it('should have proper heading hierarchy in templates', () => {
      exampleTemplates.forEach((template: ExampleTemplate) => {
        // Each template should have at least one heading
        const hasH1 = template.content.includes('<h1>')
        const hasH2 = template.content.includes('<h2>')
        const hasH3 = template.content.includes('<h3>')
        
        expect(hasH1 || hasH2 || hasH3).toBe(true)
      })
    })

    it('should include multiple content types in complex templates', () => {
      const complexTemplates = ['showcase', 'blog-post', 'documentation', 'meeting-notes']
      
      complexTemplates.forEach(id => {
        const template = getTemplateById(id)
        if (template) {
          const contentTypes = [
            template.content.includes('<strong>'),
            template.content.includes('<em>'),
            template.content.includes('<ul>') || template.content.includes('<ol>'),
            template.content.includes('<code>') || template.content.includes('<pre>')
          ].filter(Boolean).length
          
          // Should have at least 3 different content types
          expect(contentTypes).toBeGreaterThanOrEqual(3)
        }
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading levels without skipping', () => {
      exampleTemplates.forEach((template: ExampleTemplate) => {
        const hasH1 = template.content.includes('<h1>')
        const hasH3 = template.content.includes('<h3>')
        
        // If there's an H3, there should be H1 or H2
        if (hasH3) {
          expect(hasH1 || template.content.includes('<h2>')).toBe(true)
        }
      })
    })

    it('should have semantic HTML in links', () => {
      exampleTemplates.forEach((template: ExampleTemplate) => {
        const links = template.content.match(/<a[^>]+>/g) || []
        
        links.forEach(link => {
          // Links should have href attribute
          expect(link).toContain('href=')
        })
      })
    })
  })

  describe('Template Use Cases', () => {
    it('should cover different document types', () => {
      const types = exampleTemplates.map(t => t.name)
      
      // Should have variety
      expect(types.some(t => t.toLowerCase().includes('blog'))).toBe(true)
      expect(types.some(t => t.toLowerCase().includes('doc'))).toBe(true)
      expect(types.some(t => t.toLowerCase().includes('note') || t.toLowerCase().includes('meeting'))).toBe(true)
    })

    it('should have templates for different skill levels', () => {
      // Should have both simple and complex templates
      const simple = exampleTemplates.find(t => t.id === 'simple')
      const showcase = exampleTemplates.find(t => t.id === 'showcase')
      
      expect(simple).toBeDefined()
      expect(showcase).toBeDefined()
      
      if (simple && showcase) {
        expect(showcase.content.length).toBeGreaterThan(simple.content.length * 5)
      }
    })
  })
})
