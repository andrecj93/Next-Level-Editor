/**
 * Example templates for the Next Level Editor demo
 * Inspired by CKEditor's feature-rich showcase
 */

export interface ExampleTemplate {
  id: string
  name: string
  icon: string
  description: string
  content: string
}

export const exampleTemplates: ExampleTemplate[] = [
  {
    id: 'showcase',
    name: 'Feature Showcase',
    icon: '🎨',
    description: 'Comprehensive demo of all editor capabilities',
    content: `<h1>Welcome to Next Level Editor! 🚀</h1>
<p>A <strong>professional-grade</strong> WYSIWYG editor for <em>Vue.js</em> with modern features inspired by industry leaders like <strong>CKEditor</strong>, <strong>Notion</strong>, and <strong>Medium</strong>.</p>

<h2>✨ Rich Text Formatting</h2>
<p>Experience powerful text editing with <strong>bold</strong>, <em>italic</em>, <u>underline</u>, and <s>strikethrough</s> formatting. Combine them for <strong><em><u>maximum impact</u></em></strong>!</p>

<h3>📝 Multiple Heading Levels</h3>
<p>Organize your content with three heading levels (H1, H2, H3) to create a clear document structure and improve readability.</p>

<h2>📋 Lists and Organization</h2>
<p>Create structured content with both ordered and unordered lists:</p>
<ul>
  <li><strong>Unordered Lists</strong> - Perfect for features, benefits, or any non-sequential items</li>
  <li><strong>Nested Support</strong> - Create hierarchical structures with ease</li>
  <li><strong>Visual Clarity</strong> - Clean bullets for better readability</li>
</ul>

<h3>🔢 Numbered Lists</h3>
<ol>
  <li><strong>Step-by-step guides</strong> - Ideal for tutorials and instructions</li>
  <li><strong>Sequential content</strong> - Maintain order with automatic numbering</li>
  <li><strong>Professional presentation</strong> - Perfect for documentation</li>
</ol>

<h2>🎯 Text Alignment Options</h2>
<p style="text-align: left;">Left-aligned text is the default and most readable option for paragraphs and body content.</p>
<p style="text-align: center;"><strong>Center alignment</strong> works great for titles, headings, and emphasized content.</p>
<p style="text-align: right;"><em>Right alignment</em> is useful for signatures, dates, or stylistic choices.</p>
<p style="text-align: justify;">Justified text creates clean edges on both sides, commonly used in newspapers and formal documents for a polished, professional appearance with even margins.</p>

<h2>🎨 Colors and Styling</h2>
<p>Make your content stand out with <span style="color: #e74c3c;"><strong>colored text</strong></span> and <span style="background-color: #f39c12; padding: 2px 6px; border-radius: 3px;">highlighted backgrounds</span>.</p>
<p>Use colors to <span style="color: #3498db;"><strong>emphasize key points</strong></span>, <span style="color: #2ecc71;"><strong>categorize information</strong></span>, or <span style="color: #9b59b6;"><strong>create visual hierarchy</strong></span> in your documents.</p>

<h2>💻 Code and Technical Content</h2>
<p>Insert inline code like <code>const editor = new NextLevelEditor()</code> or create syntax-highlighted code blocks for 22+ programming languages:</p>

<pre><code class="language-javascript">// JavaScript Example
function greetUser(name) {
  const greeting = \`Hello, \${name}! Welcome to Next Level Editor.\`;
  console.log(greeting);
  return greeting;
}

greetUser('Developer');
</code></pre>

<pre><code class="language-python"># Python Example
def calculate_fibonacci(n):
    """Generate Fibonacci sequence up to n terms"""
    fib = [0, 1]
    for i in range(2, n):
        fib.append(fib[i-1] + fib[i-2])
    return fib

print(calculate_fibonacci(10))
</code></pre>

<h2>📊 Tables for Data</h2>
<p>Create professional tables with custom rows and columns:</p>
<table>
  <thead>
    <tr>
      <th>Feature</th>
      <th>Description</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Toolbar</strong></td>
      <td>CKEditor-inspired horizontal design</td>
      <td>✅ Available</td>
    </tr>
    <tr>
      <td><strong>Code Blocks</strong></td>
      <td>Syntax highlighting for 22 languages</td>
      <td>✅ Available</td>
    </tr>
    <tr>
      <td><strong>Dark Mode</strong></td>
      <td>Beautiful theme with persistence</td>
      <td>✅ Available</td>
    </tr>
    <tr>
      <td><strong>Auto-Save</strong></td>
      <td>Never lose your work</td>
      <td>✅ Available</td>
    </tr>
  </tbody>
</table>

<h2>🔗 Links and Navigation</h2>
<p>Add hyperlinks to <a href="https://vuejs.org" target="_blank">Vue.js</a>, <a href="https://github.com/andrecj93/next-level-editor" target="_blank">GitHub</a>, or any resource. Links are essential for connecting ideas and providing references.</p>

<h2>⚡ Quick Actions</h2>
<p><strong>Slash Commands</strong>: Type <code>/</code> anywhere to open the quick actions menu with 14+ commands for instant formatting.</p>
<p><strong>Keyboard Shortcuts</strong>: Use <kbd>Ctrl+B</kbd> for bold, <kbd>Ctrl+I</kbd> for italic, <kbd>Ctrl+F</kbd> for find & replace, and many more!</p>

<h2>🌓 Dark Mode Support</h2>
<p>Toggle between light and dark themes with smooth transitions. Your preference is saved automatically in localStorage for a consistent experience across sessions.</p>

<blockquote>
<p><strong>💡 Pro Tip:</strong> Select any text to see the floating toolbar appear instantly. This Medium-style context menu provides quick access to common formatting options without cluttering your workspace.</p>
</blockquote>

<h2>🎯 Try These Interactive Features</h2>
<ul>
  <li>Select text to see the <strong>floating toolbar</strong></li>
  <li>Type <code>/</code> to open <strong>slash commands</strong></li>
  <li>Press <kbd>Ctrl+F</kbd> to <strong>search and replace</strong></li>
  <li>Click the 🌙 icon to toggle <strong>dark mode</strong></li>
  <li>Use the export buttons to save as <strong>HTML or Markdown</strong></li>
  <li>Enter fullscreen mode for <strong>distraction-free writing</strong></li>
</ul>

<hr>

<p style="text-align: center;"><em>Built with ❤️ using Vue.js 3, TypeScript, and modern web standards</em></p>
<p style="text-align: center;"><strong>81% test coverage • 129 unit tests • 23 E2E tests • Zero security vulnerabilities</strong></p>`
  },
  {
    id: 'blog-post',
    name: 'Blog Post',
    icon: '📝',
    description: 'Perfect template for blogging and article writing',
    content: `<h1>10 Tips for Writing Better Code in 2024</h1>
<p><em>Published on November 4, 2024 • 5 min read</em></p>

<p>As software development continues to evolve, writing clean, maintainable code becomes increasingly important. Here are ten essential tips that will help you write better code this year.</p>

<h2>1. Write Self-Documenting Code</h2>
<p>Your code should be <strong>readable and self-explanatory</strong>. Use descriptive variable names, clear function names, and logical structure. Remember: <em>code is read more often than it's written</em>.</p>

<pre><code class="language-javascript">// Good: Self-documenting
function calculateTotalPrice(items, taxRate) {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  return subtotal * (1 + taxRate);
}

// Avoid: Cryptic names
function calc(i, t) {
  return i.reduce((s, x) => s + x.p, 0) * (1 + t);
}
</code></pre>

<h2>2. Keep Functions Small and Focused</h2>
<p>Each function should do <strong>one thing and do it well</strong>. This makes your code easier to test, debug, and reuse.</p>

<h2>3. Use Version Control Effectively</h2>
<p>Commit frequently with <strong>meaningful commit messages</strong>. Your future self (and your team) will thank you!</p>
<ul>
  <li>Use conventional commit format</li>
  <li>Keep commits atomic and focused</li>
  <li>Write descriptive pull request descriptions</li>
</ul>

<h2>4. Test Your Code</h2>
<p>Write tests before or alongside your code. Aim for <strong>80%+ code coverage</strong> and include both unit and integration tests.</p>

<table>
  <thead>
    <tr>
      <th>Test Type</th>
      <th>Purpose</th>
      <th>Coverage Goal</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Unit Tests</td>
      <td>Test individual functions</td>
      <td>80%+</td>
    </tr>
    <tr>
      <td>Integration Tests</td>
      <td>Test component interactions</td>
      <td>60%+</td>
    </tr>
    <tr>
      <td>E2E Tests</td>
      <td>Test user workflows</td>
      <td>Critical paths</td>
    </tr>
  </tbody>
</table>

<h2>5. Embrace Code Reviews</h2>
<p>Code reviews catch bugs, improve quality, and spread knowledge across your team. Be <strong>constructive</strong>, not critical.</p>

<blockquote>
<p>"Code review is not about finding errors in others' code; it's about learning from each other and building better software together."</p>
</blockquote>

<h2>6. Learn New Technologies</h2>
<p>Stay current with <a href="https://vuejs.org" target="_blank">modern frameworks</a> and tools, but don't chase every trend. Choose technologies that solve real problems.</p>

<h2>7. Optimize for Readability First</h2>
<p>Premature optimization is the root of all evil. Write <strong>clear code first</strong>, then optimize bottlenecks based on actual performance metrics.</p>

<h2>8. Document Your Decisions</h2>
<p>Use comments to explain <em>why</em>, not <em>what</em>. The code shows what it does; comments should explain the reasoning behind complex decisions.</p>

<h2>9. Refactor Regularly</h2>
<p>Don't let technical debt accumulate. Set aside time to <strong>refactor and improve</strong> your codebase continuously.</p>

<h2>10. Build a Personal Style Guide</h2>
<p>Consistency matters. Whether you use <code>tabs or spaces</code>, <code>single or double quotes</code>, pick a style and stick with it.</p>

<hr>

<h3>Conclusion</h3>
<p>Writing better code is a journey, not a destination. These tips will help you improve your craft and build more <strong>maintainable, scalable, and enjoyable</strong> software.</p>

<p><em>What are your favorite coding practices? Share your thoughts in the comments below! 👇</em></p>`
  },
  {
    id: 'documentation',
    name: 'Technical Documentation',
    icon: '📚',
    description: 'Professional documentation template',
    content: `<h1>API Documentation - User Authentication</h1>

<h2>Overview</h2>
<p>This documentation covers the <strong>user authentication endpoints</strong> for our REST API. All endpoints require proper authorization headers unless otherwise specified.</p>

<h2>Base URL</h2>
<pre><code>https://api.example.com/v1</code></pre>

<h2>Authentication</h2>
<p>All authenticated requests must include a <strong>JWT token</strong> in the Authorization header:</p>
<pre><code>Authorization: Bearer YOUR_JWT_TOKEN</code></pre>

<h2>Endpoints</h2>

<h3>POST /auth/register</h3>
<p>Register a new user account.</p>

<h4>Request Body</h4>
<table>
  <thead>
    <tr>
      <th>Field</th>
      <th>Type</th>
      <th>Required</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>email</code></td>
      <td>string</td>
      <td>✅ Yes</td>
      <td>Valid email address</td>
    </tr>
    <tr>
      <td><code>password</code></td>
      <td>string</td>
      <td>✅ Yes</td>
      <td>Min 8 characters</td>
    </tr>
    <tr>
      <td><code>name</code></td>
      <td>string</td>
      <td>✅ Yes</td>
      <td>User's full name</td>
    </tr>
  </tbody>
</table>

<h4>Example Request</h4>
<pre><code class="language-javascript">// Using fetch API
const response = await fetch('https://api.example.com/v1/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!',
    name: 'John Doe'
  })
});

const data = await response.json();
console.log(data);
</code></pre>

<h4>Success Response (201)</h4>
<pre><code class="language-json">{
  "success": true,
  "data": {
    "id": "usr_1234567890",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-11-04T12:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
</code></pre>

<h4>Error Responses</h4>
<table>
  <thead>
    <tr>
      <th>Status Code</th>
      <th>Description</th>
      <th>Response</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>400</code></td>
      <td>Invalid input</td>
      <td><code>{ "error": "Invalid email format" }</code></td>
    </tr>
    <tr>
      <td><code>409</code></td>
      <td>Email already exists</td>
      <td><code>{ "error": "Email already registered" }</code></td>
    </tr>
    <tr>
      <td><code>500</code></td>
      <td>Server error</td>
      <td><code>{ "error": "Internal server error" }</code></td>
    </tr>
  </tbody>
</table>

<hr>

<h3>POST /auth/login</h3>
<p>Authenticate a user and receive a JWT token.</p>

<h4>Request Body</h4>
<table>
  <thead>
    <tr>
      <th>Field</th>
      <th>Type</th>
      <th>Required</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>email</code></td>
      <td>string</td>
      <td>✅ Yes</td>
      <td>Registered email</td>
    </tr>
    <tr>
      <td><code>password</code></td>
      <td>string</td>
      <td>✅ Yes</td>
      <td>User password</td>
    </tr>
  </tbody>
</table>

<h4>Example Request</h4>
<pre><code class="language-python"># Using Python requests
import requests

response = requests.post(
    'https://api.example.com/v1/auth/login',
    json={
        'email': 'user@example.com',
        'password': 'SecurePass123!'
    }
)

data = response.json()
print(data)
</code></pre>

<h4>Success Response (200)</h4>
<pre><code class="language-json">{
  "success": true,
  "data": {
    "id": "usr_1234567890",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
</code></pre>

<blockquote>
<p><strong>⚠️ Security Note:</strong> Always use HTTPS in production. Store tokens securely and never expose them in client-side code or version control.</p>
</blockquote>

<h2>Rate Limiting</h2>
<p>API requests are limited to <strong>100 requests per minute</strong> per IP address. Exceeded limits return a <code>429 Too Many Requests</code> response.</p>

<h2>SDK Support</h2>
<p>Official SDKs available for:</p>
<ul>
  <li><a href="#" target="_blank">JavaScript/TypeScript</a></li>
  <li><a href="#" target="_blank">Python</a></li>
  <li><a href="#" target="_blank">Go</a></li>
  <li><a href="#" target="_blank">Ruby</a></li>
</ul>

<h2>Support</h2>
<p>For questions or issues, please contact <a href="mailto:support@example.com">support@example.com</a> or visit our <a href="#" target="_blank">developer forum</a>.</p>`
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    icon: '📋',
    description: 'Structured template for meeting minutes',
    content: `<h1>Product Team - Sprint Planning Meeting</h1>
<p><strong>Date:</strong> November 4, 2024<br>
<strong>Time:</strong> 10:00 AM - 11:30 AM<br>
<strong>Location:</strong> Conference Room B / Zoom</p>

<h2>📋 Attendees</h2>
<ul>
  <li><strong>Sarah Chen</strong> - Product Manager</li>
  <li><strong>Mike Johnson</strong> - Engineering Lead</li>
  <li><strong>Emily Davis</strong> - Senior Developer</li>
  <li><strong>Alex Rivera</strong> - UX Designer</li>
  <li><strong>Tom Wilson</strong> - QA Engineer</li>
</ul>

<h2>📌 Agenda</h2>
<ol>
  <li>Sprint 12 Review and Retrospective</li>
  <li>Sprint 13 Planning and Goal Setting</li>
  <li>Technical Debt Discussion</li>
  <li>Resource Allocation</li>
  <li>Q&A and Action Items</li>
</ol>

<h2>📊 Sprint 12 Review</h2>
<h3>Completed Items ✅</h3>
<ul>
  <li><s>User authentication system</s> - <strong>100% complete</strong></li>
  <li><s>Dashboard UI redesign</s> - <strong>Deployed to production</strong></li>
  <li><s>API performance optimization</s> - <strong>40% improvement</strong></li>
  <li><s>Mobile responsive fixes</s> - <strong>All devices tested</strong></li>
</ul>

<h3>Incomplete Items</h3>
<ul>
  <li><strong>Email notification system</strong> - 60% complete (moving to Sprint 13)</li>
  <li><strong>Report generation feature</strong> - Blocked by API issues</li>
</ul>

<h3>Metrics</h3>
<table>
  <thead>
    <tr>
      <th>Metric</th>
      <th>Target</th>
      <th>Actual</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Story Points</td>
      <td>45</td>
      <td>38</td>
      <td>⚠️ Below target</td>
    </tr>
    <tr>
      <td>Bug Count</td>
      <td>&lt; 10</td>
      <td>7</td>
      <td>✅ Met</td>
    </tr>
    <tr>
      <td>Code Coverage</td>
      <td>&gt; 80%</td>
      <td>84%</td>
      <td>✅ Exceeded</td>
    </tr>
  </tbody>
</table>

<h2>🎯 Sprint 13 Goals</h2>
<p><strong>Theme:</strong> Enhanced User Experience and Performance</p>

<h3>High Priority</h3>
<ol>
  <li><strong>Complete email notification system</strong>
    <ul>
      <li>Design email templates</li>
      <li>Implement queue system</li>
      <li>Add user preferences</li>
    </ul>
  </li>
  <li><strong>Fix report generation API</strong>
    <ul>
      <li>Debug timeout issues</li>
      <li>Optimize database queries</li>
      <li>Add caching layer</li>
    </ul>
  </li>
  <li><strong>Implement search functionality</strong>
    <ul>
      <li>Full-text search</li>
      <li>Filters and sorting</li>
      <li>Search history</li>
    </ul>
  </li>
</ol>

<h3>Medium Priority</h3>
<ul>
  <li>Update user documentation</li>
  <li>Refactor authentication module</li>
  <li>Add E2E tests for critical flows</li>
</ul>

<h2>🔧 Technical Debt</h2>
<blockquote>
<p><strong>Mike:</strong> "We need to allocate 20% of sprint capacity to address technical debt. The authentication module needs refactoring, and we have several deprecated API endpoints to remove."</p>
</blockquote>

<p><strong>Agreed Actions:</strong></p>
<ul>
  <li>Dedicate 9 story points (20%) to technical debt</li>
  <li>Create separate tickets for each debt item</li>
  <li>Prioritize security-related issues</li>
</ul>

<h2>💡 Key Decisions</h2>
<ol>
  <li><strong>Adopted</strong>: Use TypeScript for all new frontend components</li>
  <li><strong>Approved</strong>: Increase test coverage target to 85%</li>
  <li><strong>Postponed</strong>: Dark mode feature moved to Sprint 14</li>
</ol>

<h2>⚠️ Risks and Blockers</h2>
<table>
  <thead>
    <tr>
      <th>Risk</th>
      <th>Impact</th>
      <th>Mitigation</th>
      <th>Owner</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>API performance issues</td>
      <td>High</td>
      <td>Dedicated optimization sprint</td>
      <td>Mike</td>
    </tr>
    <tr>
      <td>Resource availability</td>
      <td>Medium</td>
      <td>Cross-training team members</td>
      <td>Sarah</td>
    </tr>
    <tr>
      <td>Third-party service downtime</td>
      <td>Low</td>
      <td>Implement fallback mechanisms</td>
      <td>Emily</td>
    </tr>
  </tbody>
</table>

<h2>✅ Action Items</h2>
<table>
  <thead>
    <tr>
      <th>Action</th>
      <th>Owner</th>
      <th>Due Date</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Create Sprint 13 tickets in Jira</td>
      <td>Sarah</td>
      <td>Nov 4, 2024</td>
      <td>🟡 In Progress</td>
    </tr>
    <tr>
      <td>Schedule API performance review</td>
      <td>Mike</td>
      <td>Nov 5, 2024</td>
      <td>⚪ Not Started</td>
    </tr>
    <tr>
      <td>Update technical debt backlog</td>
      <td>Emily</td>
      <td>Nov 4, 2024</td>
      <td>🟡 In Progress</td>
    </tr>
    <tr>
      <td>Design email templates mockups</td>
      <td>Alex</td>
      <td>Nov 6, 2024</td>
      <td>⚪ Not Started</td>
    </tr>
    <tr>
      <td>Set up E2E test framework</td>
      <td>Tom</td>
      <td>Nov 7, 2024</td>
      <td>⚪ Not Started</td>
    </tr>
  </tbody>
</table>

<h2>📅 Next Meeting</h2>
<p><strong>Date:</strong> November 11, 2024<br>
<strong>Time:</strong> 10:00 AM<br>
<strong>Topic:</strong> Sprint 13 Mid-Sprint Check-in</p>

<hr>

<p><em>Notes compiled by Sarah Chen • Last updated: November 4, 2024, 11:35 AM</em></p>`
  },
  {
    id: 'simple',
    name: 'Simple Start',
    icon: '✏️',
    description: 'Clean slate with minimal content',
    content: `<h2>Start Writing Here...</h2>
<p>Click here to begin typing your content. Try these features:</p>
<ul>
  <li>Type <code>/</code> for quick commands</li>
  <li>Press <kbd>Ctrl+B</kbd> to make text <strong>bold</strong></li>
  <li>Select text to see the floating toolbar</li>
</ul>
<p><br></p>`
  }
]

// Import media-rich examples
import { mediaExamples } from './mediaExamples'

/**
 * Combined array of all example templates
 * Includes both basic examples and media-rich examples
 */
export const allExamples: ExampleTemplate[] = [
  ...exampleTemplates,
  ...mediaExamples
]

export function getTemplateById(id: string): ExampleTemplate | undefined {
  return allExamples.find(template => template.id === id)
}

export function getDefaultTemplate(): ExampleTemplate {
  return exampleTemplates[0] // Return showcase template by default
}

/**
 * Get all available templates
 */
export function getAllTemplates(): ExampleTemplate[] {
  return allExamples
}
