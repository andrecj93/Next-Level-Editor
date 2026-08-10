/**
 * Document Templates Utility
 * Pre-built content templates for quick start
 */

export interface Template {
  id: string
  name: string
  description: string
  icon: string
  content: string
  category: 'document' | 'email' | 'blog' | 'marketing'
}

export const templates: Template[] = [
  {
    id: 'blank',
    name: 'Blank Document',
    description: 'Start with an empty document',
    icon: '📄',
    content: '<p><br></p>',
    category: 'document',
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description: 'Template for taking meeting notes',
    icon: '📝',
    content: `
<h1>Meeting Notes</h1>
<p><strong>Date:</strong> [Insert Date]</p>
<p><strong>Attendees:</strong> [List attendees]</p>
<p><strong>Agenda:</strong></p>
<ul>
  <li>Topic 1</li>
  <li>Topic 2</li>
  <li>Topic 3</li>
</ul>
<h2>Discussion Points</h2>
<p>[Add discussion notes here]</p>
<h2>Action Items</h2>
<ul>
  <li>[ ] Action item 1</li>
  <li>[ ] Action item 2</li>
</ul>
<h2>Next Steps</h2>
<p>[Add next steps here]</p>
    `.trim(),
    category: 'document',
  },
  {
    id: 'project-proposal',
    name: 'Project Proposal',
    description: 'Professional project proposal template',
    icon: '📊',
    content: `
<h1>Project Proposal</h1>
<h2>Executive Summary</h2>
<p>[Brief overview of the project]</p>
<h2>Project Objectives</h2>
<ul>
  <li>Objective 1</li>
  <li>Objective 2</li>
  <li>Objective 3</li>
</ul>
<h2>Scope of Work</h2>
<p>[Describe what will be included in the project]</p>
<h2>Timeline</h2>
<table>
  <thead>
    <tr>
      <th>Phase</th>
      <th>Duration</th>
      <th>Deliverables</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Phase 1</td>
      <td>2 weeks</td>
      <td>Initial deliverables</td>
    </tr>
    <tr>
      <td>Phase 2</td>
      <td>4 weeks</td>
      <td>Core deliverables</td>
    </tr>
  </tbody>
</table>
<h2>Budget</h2>
<p>[Budget details]</p>
<h2>Conclusion</h2>
<p>[Closing statement]</p>
    `.trim(),
    category: 'document',
  },
  {
    id: 'email-template',
    name: 'Professional Email',
    description: 'Template for professional email',
    icon: '📧',
    content: `
<p>Dear [Recipient Name],</p>
<p>I hope this email finds you well.</p>
<p>[Email body content goes here]</p>
<p>Looking forward to your response.</p>
<p>Best regards,<br>[Your Name]<br>[Your Title]<br>[Contact Information]</p>
    `.trim(),
    category: 'email',
  },
  {
    id: 'blog-post',
    name: 'Blog Post',
    description: 'Structure for a blog article',
    icon: '✍️',
    content: `
<h1>[Blog Post Title]</h1>
<p><em>Published on [Date] by [Author]</em></p>
<p><strong>Introduction:</strong> [Hook your readers with an engaging opening]</p>
<h2>The Problem</h2>
<p>[Describe the problem or challenge your readers face]</p>
<h2>The Solution</h2>
<p>[Present your solution or main points]</p>
<h3>Point 1</h3>
<p>[Elaborate on your first point]</p>
<h3>Point 2</h3>
<p>[Elaborate on your second point]</p>
<h3>Point 3</h3>
<p>[Elaborate on your third point]</p>
<h2>Conclusion</h2>
<p>[Summarize key takeaways and provide a call-to-action]</p>
<hr>
<p><strong>About the Author:</strong> [Brief author bio]</p>
    `.trim(),
    category: 'blog',
  },
  {
    id: 'product-description',
    name: 'Product Description',
    description: 'Marketing copy for products',
    icon: '🛍️',
    content: `
<h1>[Product Name]</h1>
<p><strong>Tagline:</strong> [Catchy one-liner about your product]</p>
<h2>Overview</h2>
<p>[Brief description of what the product is and who it's for]</p>
<h2>Key Features</h2>
<ul>
  <li><strong>Feature 1:</strong> Description of feature</li>
  <li><strong>Feature 2:</strong> Description of feature</li>
  <li><strong>Feature 3:</strong> Description of feature</li>
  <li><strong>Feature 4:</strong> Description of feature</li>
</ul>
<h2>Benefits</h2>
<ul>
  <li>Benefit 1</li>
  <li>Benefit 2</li>
  <li>Benefit 3</li>
</ul>
<h2>Specifications</h2>
<table>
  <tbody>
    <tr>
      <td><strong>Dimensions</strong></td>
      <td>[Product dimensions]</td>
    </tr>
    <tr>
      <td><strong>Weight</strong></td>
      <td>[Product weight]</td>
    </tr>
    <tr>
      <td><strong>Materials</strong></td>
      <td>[Product materials]</td>
    </tr>
  </tbody>
</table>
<h2>Call to Action</h2>
<p><strong>Order now and [special offer details]!</strong></p>
    `.trim(),
    category: 'marketing',
  },
  {
    id: 'press-release',
    name: 'Press Release',
    description: 'Professional press release template',
    icon: '📰',
    content: `
<h1>FOR IMMEDIATE RELEASE</h1>
<p><strong>Contact:</strong><br>[Your Name]<br>[Company Name]<br>[Phone]<br>[Email]</p>
<hr>
<h1>[Compelling Headline]</h1>
<h2>[Subheadline with Additional Context]</h2>
<p><strong>[CITY, STATE] – [Date]</strong> – [Opening paragraph with the who, what, when, where, why, and how]</p>
<p>[Second paragraph with supporting details and quotes from key stakeholders]</p>
<blockquote>
  <p>"[Quote from company executive or key stakeholder]" said [Name, Title].</p>
</blockquote>
<p>[Third paragraph with additional information, benefits, and context]</p>
<h2>About [Company Name]</h2>
<p>[Boilerplate company description]</p>
<hr>
<p>###</p>
    `.trim(),
    category: 'marketing',
  },
  {
    id: 'technical-doc',
    name: 'Technical Documentation',
    description: 'Template for technical documentation',
    icon: '🔧',
    content: `
<h1>[Feature/Component Name]</h1>
<h2>Overview</h2>
<p>[Brief description of the feature or component]</p>
<h2>Prerequisites</h2>
<ul>
  <li>Requirement 1</li>
  <li>Requirement 2</li>
</ul>
<h2>Installation</h2>
<pre><code>npm install package-name</code></pre>
<h2>Usage</h2>
<pre><code>// Example code snippet
import { Component } from 'package-name'

// Implementation example</code></pre>
<h2>API Reference</h2>
<h3>Properties</h3>
<table>
  <thead>
    <tr>
      <th>Property</th>
      <th>Type</th>
      <th>Default</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>prop1</td>
      <td>string</td>
      <td>''</td>
      <td>Description</td>
    </tr>
  </tbody>
</table>
<h3>Methods</h3>
<ul>
  <li><code>method1()</code> - Description of what it does</li>
  <li><code>method2(param)</code> - Description with parameter</li>
</ul>
<h2>Examples</h2>
<h3>Basic Example</h3>
<pre><code>// Example code</code></pre>
<h3>Advanced Example</h3>
<pre><code>// Advanced example code</code></pre>
<h2>Troubleshooting</h2>
<h3>Common Issue 1</h3>
<p><strong>Problem:</strong> [Description of the problem]</p>
<p><strong>Solution:</strong> [How to fix it]</p>
    `.trim(),
    category: 'document',
  },
]

/**
 * Get all available templates
 */
export function getTemplates(): Template[] {
  return templates
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: Template['category']
): Template[] {
  return templates.filter((t) => t.category === category)
}

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): Template | undefined {
  return templates.find((t) => t.id === id)
}

/**
 * Get template categories
 */
export function getTemplateCategories(): Template['category'][] {
  return ['document', 'email', 'blog', 'marketing']
}
