import { describe, it, expect } from 'vitest'
import {
  getTemplates,
  getTemplatesByCategory,
  getTemplateById,
  getTemplateCategories,
} from '../templates'

describe('Templates', () => {
  it('should get all templates', () => {
    const templates = getTemplates()
    expect(templates).toBeDefined()
    expect(Array.isArray(templates)).toBe(true)
    expect(templates.length).toBeGreaterThan(0)
  })

  it('should have required template properties', () => {
    const templates = getTemplates()
    templates.forEach((template) => {
      expect(template.id).toBeDefined()
      expect(template.name).toBeDefined()
      expect(template.description).toBeDefined()
      expect(template.icon).toBeDefined()
      expect(template.content).toBeDefined()
      expect(template.category).toBeDefined()
    })
  })

  it('should get templates by category', () => {
    const documentTemplates = getTemplatesByCategory('document')
    expect(documentTemplates.every((t) => t.category === 'document')).toBe(true)

    const emailTemplates = getTemplatesByCategory('email')
    expect(emailTemplates.every((t) => t.category === 'email')).toBe(true)

    const blogTemplates = getTemplatesByCategory('blog')
    expect(blogTemplates.every((t) => t.category === 'blog')).toBe(true)

    const marketingTemplates = getTemplatesByCategory('marketing')
    expect(marketingTemplates.every((t) => t.category === 'marketing')).toBe(true)
  })

  it('should get template by id', () => {
    const blank = getTemplateById('blank')
    expect(blank).toBeDefined()
    expect(blank?.name).toBe('Blank Document')

    const meetingNotes = getTemplateById('meeting-notes')
    expect(meetingNotes).toBeDefined()
    expect(meetingNotes?.name).toBe('Meeting Notes')
  })

  it('should return undefined for non-existent template id', () => {
    const template = getTemplateById('non-existent')
    expect(template).toBeUndefined()
  })

  it('should get template categories', () => {
    const categories = getTemplateCategories()
    expect(categories).toContain('document')
    expect(categories).toContain('email')
    expect(categories).toContain('blog')
    expect(categories).toContain('marketing')
  })

  it('should have unique template ids', () => {
    const templates = getTemplates()
    const ids = templates.map((t) => t.id)
    const uniqueIds = new Set(ids)
    expect(ids.length).toBe(uniqueIds.size)
  })

  it('should have non-empty template content', () => {
    const templates = getTemplates()
    templates.forEach((template) => {
      expect(template.content.length).toBeGreaterThan(0)
    })
  })

  it('should include blank template', () => {
    const templates = getTemplates()
    const blank = templates.find((t) => t.id === 'blank')
    expect(blank).toBeDefined()
    expect(blank?.category).toBe('document')
  })

  it('should include meeting notes template', () => {
    const templates = getTemplates()
    const meetingNotes = templates.find((t) => t.id === 'meeting-notes')
    expect(meetingNotes).toBeDefined()
    expect(meetingNotes?.content).toContain('Meeting Notes')
  })

  it('should include project proposal template', () => {
    const templates = getTemplates()
    const proposal = templates.find((t) => t.id === 'project-proposal')
    expect(proposal).toBeDefined()
    expect(proposal?.content).toContain('Project Proposal')
  })

  it('should include email template', () => {
    const templates = getTemplates()
    const email = templates.find((t) => t.id === 'email-template')
    expect(email).toBeDefined()
    expect(email?.category).toBe('email')
  })

  it('should include blog post template', () => {
    const templates = getTemplates()
    const blog = templates.find((t) => t.id === 'blog-post')
    expect(blog).toBeDefined()
    expect(blog?.category).toBe('blog')
  })
})
