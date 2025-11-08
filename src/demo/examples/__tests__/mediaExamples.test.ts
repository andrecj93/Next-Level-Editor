import { describe, it, expect } from 'vitest'
import { 
  mediaExamples, 
  getMediaExampleById, 
  getAllMediaExamples,
  placeholderImages,
} from '../mediaExamples'
import type { ExampleTemplate } from '../exampleTemplates'

describe('mediaExamples', () => {
  describe('Placeholder Images', () => {
    it('should have all required placeholder images', () => {
      expect(placeholderImages).toHaveProperty('product')
      expect(placeholderImages).toHaveProperty('travel')
      expect(placeholderImages).toHaveProperty('recipe')
      expect(placeholderImages).toHaveProperty('portfolio')
      expect(placeholderImages).toHaveProperty('screenshot')
    })

    it('should have valid base64 data URIs for all placeholders', () => {
      Object.values(placeholderImages).forEach(image => {
        expect(image).toMatch(/^data:image\/svg\+xml;base64,/)
        expect(image.length).toBeGreaterThan(50)
      })
    })

    it('should have unique placeholder images', () => {
      const images = Object.values(placeholderImages)
      const uniqueImages = new Set(images)
      expect(uniqueImages.size).toBe(images.length)
    })
  })

  describe('Media Examples Structure', () => {
    it('should have at least 5 media-rich examples', () => {
      expect(mediaExamples.length).toBeGreaterThanOrEqual(5)
    })

    it('should have all required fields for each example', () => {
      mediaExamples.forEach((example: ExampleTemplate) => {
        expect(example).toHaveProperty('id')
        expect(example).toHaveProperty('name')
        expect(example).toHaveProperty('icon')
        expect(example).toHaveProperty('description')
        expect(example).toHaveProperty('content')
        
        expect(typeof example.id).toBe('string')
        expect(typeof example.name).toBe('string')
        expect(typeof example.icon).toBe('string')
        expect(typeof example.description).toBe('string')
        expect(typeof example.content).toBe('string')
      })
    })

    it('should have unique IDs for each example', () => {
      const ids = mediaExamples.map(e => e.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(mediaExamples.length)
    })

    it('should have substantial content for each example', () => {
      mediaExamples.forEach((example: ExampleTemplate) => {
        expect(example.content.length).toBeGreaterThan(500)
      })
    })
  })

  describe('Product Showcase Example', () => {
    it('should exist and have correct metadata', () => {
      const product = mediaExamples.find(e => e.id === 'product-showcase')
      expect(product).toBeDefined()
      expect(product?.name).toBe('Product Showcase')
      expect(product?.icon).toBe('🛍️')
    })

    it('should include product image', () => {
      const product = mediaExamples.find(e => e.id === 'product-showcase')
      expect(product?.content).toContain('<img')
      expect(product?.content).toContain(placeholderImages.product)
      expect(product?.content).toContain('alt=')
    })

    it('should include product features and pricing', () => {
      const product = mediaExamples.find(e => e.id === 'product-showcase')
      expect(product?.content).toContain('Key Features')
      expect(product?.content).toContain('<ul>')
      expect(product?.content).toContain('Pricing')
      expect(product?.content).toContain('$')
    })

    it('should include product table', () => {
      const product = mediaExamples.find(e => e.id === 'product-showcase')
      expect(product?.content).toContain('<table>')
      expect(product?.content).toContain('<thead>')
      expect(product?.content).toContain('<tbody>')
    })

    it('should include video embed', () => {
      const product = mediaExamples.find(e => e.id === 'product-showcase')
      expect(product?.content).toContain('<iframe')
      expect(product?.content).toContain('youtube.com/embed')
    })

    it('should include customer reviews', () => {
      const product = mediaExamples.find(e => e.id === 'product-showcase')
      expect(product?.content).toContain('Customer Reviews')
      expect(product?.content).toContain('<blockquote>')
      expect(product?.content).toContain('⭐')
    })
  })

  describe('Travel Blog Example', () => {
    it('should exist and have correct metadata', () => {
      const travel = mediaExamples.find(e => e.id === 'travel-blog')
      expect(travel).toBeDefined()
      expect(travel?.name).toBe('Travel Blog')
      expect(travel?.icon).toBe('✈️')
    })

    it('should include travel photos with captions', () => {
      const travel = mediaExamples.find(e => e.id === 'travel-blog')
      expect(travel?.content).toContain('<img')
      expect(travel?.content).toContain(placeholderImages.travel)
      expect(travel?.content).toContain('alt=')
      // Should have image caption
      expect(travel?.content).toMatch(/Tokyo.*skyline/i)
    })

    it('should include itinerary and places', () => {
      const travel = mediaExamples.find(e => e.id === 'travel-blog')
      expect(travel?.content).toContain('Day')
      expect(travel?.content).toContain('Shibuya')
      expect(travel?.content).toContain('Harajuku')
    })

    it('should include food recommendations table', () => {
      const travel = mediaExamples.find(e => e.id === 'travel-blog')
      expect(travel?.content).toContain('Food Experiences')
      expect(travel?.content).toContain('<table>')
      expect(travel?.content).toContain('Sushi')
      expect(travel?.content).toContain('Ramen')
    })

    it('should include budget breakdown', () => {
      const travel = mediaExamples.find(e => e.id === 'travel-blog')
      expect(travel?.content).toContain('Budget Breakdown')
      expect(travel?.content).toContain('¥')
      expect(travel?.content).toContain('<pre><code>')
    })

    it('should include video content', () => {
      const travel = mediaExamples.find(e => e.id === 'travel-blog')
      expect(travel?.content).toContain('<iframe')
      expect(travel?.content).toContain('youtube.com/embed')
    })

    it('should include travel tips', () => {
      const travel = mediaExamples.find(e => e.id === 'travel-blog')
      expect(travel?.content).toContain('Travel Tips')
      expect(travel?.content).toContain('<ol>')
    })
  })

  describe('Recipe Example', () => {
    it('should exist and have correct metadata', () => {
      const recipe = mediaExamples.find(e => e.id === 'recipe')
      expect(recipe).toBeDefined()
      expect(recipe?.name).toBe('Recipe Card')
      expect(recipe?.icon).toBe('🍳')
    })

    it('should include recipe image', () => {
      const recipe = mediaExamples.find(e => e.id === 'recipe')
      expect(recipe?.content).toContain('<img')
      expect(recipe?.content).toContain(placeholderImages.recipe)
      expect(recipe?.content).toContain('alt=')
    })

    it('should include timing information', () => {
      const recipe = mediaExamples.find(e => e.id === 'recipe')
      expect(recipe?.content).toContain('Prep Time')
      expect(recipe?.content).toContain('Cook Time')
      expect(recipe?.content).toContain('Total Time')
      expect(recipe?.content).toContain('minutes')
    })

    it('should include ingredients list', () => {
      const recipe = mediaExamples.find(e => e.id === 'recipe')
      expect(recipe?.content).toContain('Ingredients')
      expect(recipe?.content).toContain('<ul>')
      expect(recipe?.content).toContain('cups')
      expect(recipe?.content).toContain('tsp')
    })

    it('should include step-by-step instructions', () => {
      const recipe = mediaExamples.find(e => e.id === 'recipe')
      expect(recipe?.content).toContain('Instructions')
      expect(recipe?.content).toContain('Step 1')
      expect(recipe?.content).toContain('Step 2')
      expect(recipe?.content).toContain('<ol>')
    })

    it('should include nutrition information table', () => {
      const recipe = mediaExamples.find(e => e.id === 'recipe')
      expect(recipe?.content).toContain('Nutrition Information')
      expect(recipe?.content).toContain('<table>')
      expect(recipe?.content).toContain('Calories')
      expect(recipe?.content).toContain('Fat')
    })

    it('should include video tutorial', () => {
      const recipe = mediaExamples.find(e => e.id === 'recipe')
      expect(recipe?.content).toContain('Video Tutorial')
      expect(recipe?.content).toContain('<iframe')
      expect(recipe?.content).toContain('youtube.com/embed')
    })

    it('should include pro tips and variations', () => {
      const recipe = mediaExamples.find(e => e.id === 'recipe')
      expect(recipe?.content).toContain('Pro Tips')
      expect(recipe?.content).toContain('Variations')
    })

    it('should include storage instructions', () => {
      const recipe = mediaExamples.find(e => e.id === 'recipe')
      expect(recipe?.content).toContain('Storage')
      expect(recipe?.content).toContain('Room Temperature')
    })
  })

  describe('Portfolio Example', () => {
    it('should exist and have correct metadata', () => {
      const portfolio = mediaExamples.find(e => e.id === 'portfolio')
      expect(portfolio).toBeDefined()
      expect(portfolio?.name).toBe('Portfolio/Resume')
      expect(portfolio?.icon).toBe('👔')
    })

    it('should include profile photo', () => {
      const portfolio = mediaExamples.find(e => e.id === 'portfolio')
      expect(portfolio?.content).toContain('<img')
      expect(portfolio?.content).toContain(placeholderImages.portfolio)
      expect(portfolio?.content).toContain('Profile Photo')
    })

    it('should include contact information', () => {
      const portfolio = mediaExamples.find(e => e.id === 'portfolio')
      expect(portfolio?.content).toContain('mailto:')
      expect(portfolio?.content).toContain('github.com')
      expect(portfolio?.content).toContain('linkedin.com')
    })

    it('should include work experience', () => {
      const portfolio = mediaExamples.find(e => e.id === 'portfolio')
      expect(portfolio?.content).toContain('Professional Experience')
      expect(portfolio?.content).toContain('Senior')
      expect(portfolio?.content).toContain('2022')
    })

    it('should include technical skills table', () => {
      const portfolio = mediaExamples.find(e => e.id === 'portfolio')
      expect(portfolio?.content).toContain('Technical Skills')
      expect(portfolio?.content).toContain('<table>')
      expect(portfolio?.content).toContain('React')
      expect(portfolio?.content).toContain('Vue')
    })

    it('should include featured projects', () => {
      const portfolio = mediaExamples.find(e => e.id === 'portfolio')
      expect(portfolio?.content).toContain('Featured Projects')
      expect(portfolio?.content).toContain('GitHub')
    })

    it('should include education section', () => {
      const portfolio = mediaExamples.find(e => e.id === 'portfolio')
      expect(portfolio?.content).toContain('Education')
      expect(portfolio?.content).toContain('Bachelor')
      expect(portfolio?.content).toContain('GPA')
    })

    it('should include video content', () => {
      const portfolio = mediaExamples.find(e => e.id === 'portfolio')
      expect(portfolio?.content).toContain('Conference Talks')
      expect(portfolio?.content).toContain('<iframe')
      expect(portfolio?.content).toContain('youtube.com/embed')
    })

    it('should include testimonials', () => {
      const portfolio = mediaExamples.find(e => e.id === 'portfolio')
      expect(portfolio?.content).toContain('Testimonials')
      expect(portfolio?.content).toContain('<blockquote>')
    })
  })

  describe('Tutorial Example', () => {
    it('should exist and have correct metadata', () => {
      const tutorial = mediaExamples.find(e => e.id === 'tutorial')
      expect(tutorial).toBeDefined()
      expect(tutorial?.name).toBe('Tutorial Guide')
      expect(tutorial?.icon).toBe('📖')
    })

    it('should include screenshot/demo image', () => {
      const tutorial = mediaExamples.find(e => e.id === 'tutorial')
      expect(tutorial?.content).toContain('<img')
      expect(tutorial?.content).toContain(placeholderImages.screenshot)
    })

    it('should include difficulty and time estimates', () => {
      const tutorial = mediaExamples.find(e => e.id === 'tutorial')
      expect(tutorial?.content).toContain('Difficulty')
      expect(tutorial?.content).toContain('Time')
      expect(tutorial?.content).toContain('minutes')
    })

    it('should include prerequisites table', () => {
      const tutorial = mediaExamples.find(e => e.id === 'tutorial')
      expect(tutorial?.content).toContain('Prerequisites')
      expect(tutorial?.content).toContain('<table>')
      expect(tutorial?.content).toContain('Node.js')
    })

    it('should include step-by-step instructions', () => {
      const tutorial = mediaExamples.find(e => e.id === 'tutorial')
      expect(tutorial?.content).toContain('Step 1')
      expect(tutorial?.content).toContain('Step 2')
      expect(tutorial?.content).toContain('Step 3')
    })

    it('should include code examples with syntax highlighting', () => {
      const tutorial = mediaExamples.find(e => e.id === 'tutorial')
      expect(tutorial?.content).toContain('<pre><code')
      expect(tutorial?.content).toContain('language-javascript')
      expect(tutorial?.content).toContain('language-bash')
    })

    it('should include video walkthrough', () => {
      const tutorial = mediaExamples.find(e => e.id === 'tutorial')
      expect(tutorial?.content).toContain('Video Walkthrough')
      expect(tutorial?.content).toContain('<iframe')
      expect(tutorial?.content).toContain('youtube.com/embed')
    })

    it('should include troubleshooting section', () => {
      const tutorial = mediaExamples.find(e => e.id === 'tutorial')
      expect(tutorial?.content).toContain('Troubleshooting')
    })

    it('should include next steps or additional resources', () => {
      const tutorial = mediaExamples.find(e => e.id === 'tutorial')
      expect(tutorial?.content).toContain('Next Steps')
      expect(tutorial?.content).toContain('Additional Resources')
    })
  })

  describe('Media Integration', () => {
    it('all examples should include at least one image', () => {
      mediaExamples.forEach((example: ExampleTemplate) => {
        expect(example.content).toContain('<img')
        expect(example.content).toContain('src=')
        expect(example.content).toContain('alt=')
      })
    })

    it('all examples should include video embeds', () => {
      mediaExamples.forEach((example: ExampleTemplate) => {
        expect(example.content).toContain('<iframe')
        expect(example.content).toContain('youtube.com/embed')
      })
    })

    it('all images should have alt text for accessibility', () => {
      mediaExamples.forEach((example: ExampleTemplate) => {
        const imgTags = example.content.match(/<img[^>]+>/g) || []
        imgTags.forEach(img => {
          expect(img).toContain('alt=')
        })
      })
    })

    it('all video embeds should be responsive', () => {
      mediaExamples.forEach((example: ExampleTemplate) => {
        if (example.content.includes('<iframe')) {
          expect(example.content).toContain('video-container')
          expect(example.content).toContain('padding-bottom: 56.25%')
        }
      })
    })
  })

  describe('Content Quality', () => {
    it('all examples should have proper heading hierarchy', () => {
      mediaExamples.forEach((example: ExampleTemplate) => {
        expect(example.content).toContain('<h1>')
        expect(example.content).toContain('<h2>')
      })
    })

    it('all examples should include tables for structured data', () => {
      mediaExamples.forEach((example: ExampleTemplate) => {
        expect(example.content).toContain('<table>')
        expect(example.content).toContain('<thead>')
        expect(example.content).toContain('<tbody>')
      })
    })

    it('all examples should include lists', () => {
      mediaExamples.forEach((example: ExampleTemplate) => {
        const hasLists = example.content.includes('<ul>') || example.content.includes('<ol>')
        expect(hasLists).toBe(true)
      })
    })

    it('all examples should have rich formatting', () => {
      mediaExamples.forEach((example: ExampleTemplate) => {
        expect(example.content).toContain('<strong>')
        expect(example.content).toContain('<em>')
      })
    })

    it('examples should not contain dangerous HTML', () => {
      mediaExamples.forEach((example: ExampleTemplate) => {
        expect(example.content).not.toContain('<script')
        expect(example.content).not.toContain('javascript:')
        expect(example.content).not.toContain('onerror=')
        expect(example.content).not.toContain('onclick=')
      })
    })
  })

  describe('getMediaExampleById', () => {
    it('should return correct example by ID', () => {
      const product = getMediaExampleById('product-showcase')
      expect(product).toBeDefined()
      expect(product?.id).toBe('product-showcase')
      expect(product?.name).toBe('Product Showcase')
    })

    it('should return undefined for non-existent ID', () => {
      const result = getMediaExampleById('non-existent-id')
      expect(result).toBeUndefined()
    })

    it('should work for all valid example IDs', () => {
      const validIds = ['product-showcase', 'travel-blog', 'recipe', 'portfolio', 'tutorial']
      
      validIds.forEach(id => {
        const example = getMediaExampleById(id)
        expect(example).toBeDefined()
        expect(example?.id).toBe(id)
      })
    })
  })

  describe('getAllMediaExamples', () => {
    it('should return all media examples', () => {
      const allExamples = getAllMediaExamples()
      expect(allExamples).toEqual(mediaExamples)
      expect(allExamples.length).toBeGreaterThanOrEqual(5)
    })

    it('should return a new array reference', () => {
      const examples1 = getAllMediaExamples()
      const examples2 = getAllMediaExamples()
      expect(examples1).toEqual(examples2)
    })
  })

  describe('Example Icons', () => {
    it('should have unique emoji icons', () => {
      const icons = mediaExamples.map(e => e.icon)
      const uniqueIcons = new Set(icons)
      expect(uniqueIcons.size).toBe(mediaExamples.length)
    })

    it('should have descriptive icons matching content type', () => {
      const expectedIcons: Record<string, string> = {
        'product-showcase': '🛍️',
        'travel-blog': '✈️',
        'recipe': '🍳',
        'portfolio': '👔',
        'tutorial': '📖'
      }

      Object.entries(expectedIcons).forEach(([id, expectedIcon]) => {
        const example = getMediaExampleById(id)
        expect(example?.icon).toBe(expectedIcon)
      })
    })
  })

  describe('Example Descriptions', () => {
    it('should have concise descriptions', () => {
      mediaExamples.forEach((example: ExampleTemplate) => {
        expect(example.description.length).toBeGreaterThan(15)
        expect(example.description.length).toBeLessThan(100)
      })
    })

    it('should have unique descriptions', () => {
      const descriptions = mediaExamples.map(e => e.description)
      const uniqueDescriptions = new Set(descriptions)
      expect(uniqueDescriptions.size).toBe(mediaExamples.length)
    })
  })

  describe('Practical Use Cases', () => {
    it('should cover diverse content types', () => {
      const types = mediaExamples.map(e => e.name.toLowerCase())
      
      // Should have different domains
      expect(types.some(t => t.includes('product'))).toBe(true)
      expect(types.some(t => t.includes('travel'))).toBe(true)
      expect(types.some(t => t.includes('recipe'))).toBe(true)
      expect(types.some(t => t.includes('portfolio'))).toBe(true)
      expect(types.some(t => t.includes('tutorial'))).toBe(true)
    })

    it('examples should be production-ready templates', () => {
      mediaExamples.forEach((example: ExampleTemplate) => {
        // Should have substantial, usable content
        expect(example.content.length).toBeGreaterThan(2000)
        
        // Should have proper structure
        expect(example.content).toContain('<h1>')
        expect(example.content).toContain('<p>')
        
        // Should include multiple content types
        const contentTypes = [
          example.content.includes('<img'),
          example.content.includes('<table>'),
          example.content.includes('<iframe'),
          example.content.includes('<ul>') || example.content.includes('<ol>'),
          example.content.includes('<blockquote>') || example.content.includes('<pre>')
        ].filter(Boolean).length
        
        expect(contentTypes).toBeGreaterThanOrEqual(4)
      })
    })
  })
})
