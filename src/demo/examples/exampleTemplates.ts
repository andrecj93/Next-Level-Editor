/**
 * Example templates for the Next Level Editor demo
 * Inspired by CKEditor's feature-rich showcase
 */

export interface ExampleTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  content: string;
}

export const exampleTemplates: ExampleTemplate[] = [
  {
    id: "empty",
    name: "Empty Document",
    icon: "📄",
    description: "Start from scratch",
    content: `<h2>New Document</h2><p><br></p>`,
  },
  {
    id: "showcase",
    name: "Feature Showcase",
    icon: "🎨",
    description: "Comprehensive demo of all editor capabilities",
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
<p style="text-align: center;"><strong>81% test coverage • 129 unit tests • 23 E2E tests • Zero security vulnerabilities</strong></p>`,
  },
  {
    id: "blog-post",
    name: "Blog Post",
    icon: "📝",
    description: "Perfect template for blogging and article writing",
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

<p><em>What are your favorite coding practices? Share your thoughts in the comments below! 👇</em></p>`,
  },
  {
    id: "documentation",
    name: "Technical Documentation",
    icon: "📚",
    description: "Professional documentation template",
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
<p>For questions or issues, please contact <a href="mailto:support@example.com">support@example.com</a> or visit our <a href="#" target="_blank">developer forum</a>.</p>`,
  },
  {
    id: "meeting-notes",
    name: "Meeting Notes",
    icon: "📋",
    description: "Structured template for meeting minutes",
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

<p><em>Notes compiled by Sarah Chen • Last updated: November 4, 2024, 11:35 AM</em></p>`,
  },
  {
    id: "simple",
    name: "Simple Start",
    icon: "✏️",
    description: "Clean slate with minimal content",
    content: `<h2>Start Writing Here...</h2>
<p>Click here to begin typing your content. Try these features:</p>
<ul>
  <li>Type <code>/</code> for quick commands</li>
  <li>Press <kbd>Ctrl+B</kbd> to make text <strong>bold</strong></li>
  <li>Select text to see the floating toolbar</li>
</ul>
<p><br></p>`,
  },
  {
    id: "newsletter",
    name: "Newsletter",
    icon: "📧",
    description: "Professional email newsletter template",
    content: `<h1 style="text-align: center;">🚀 The Weekly Tech Digest</h1>
<p style="text-align: center;"><em>Issue #42 • November 2024 • Your source for tech insights</em></p>

<hr>

<h2>👋 Hello from the Editor!</h2>
<p>Welcome to this week's edition of The Weekly Tech Digest! We've curated the most exciting developments in technology, development tools, and industry trends just for you.</p>

<h2>🔥 Top Stories This Week</h2>

<h3>1. Vue 3.5 Released with Major Performance Improvements</h3>
<p>The Vue.js team has announced Vue 3.5, bringing significant performance enhancements and new features. <a href="https://vuejs.org" target="_blank">Read the full announcement</a> to learn about:</p>
<ul>
  <li><strong>Reactivity improvements</strong> - Up to 30% faster rendering</li>
  <li><strong>TypeScript enhancements</strong> - Better type inference</li>
  <li><strong>New composition utilities</strong> - Simplified state management</li>
</ul>

<h3>2. The Rise of Edge Computing in 2024</h3>
<p>Edge computing continues to transform how we build and deploy applications. Key benefits include:</p>
<table>
  <thead>
    <tr>
      <th>Benefit</th>
      <th>Impact</th>
      <th>Use Case</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Lower Latency</td>
      <td>50-90% reduction</td>
      <td>Real-time apps</td>
    </tr>
    <tr>
      <td>Reduced Bandwidth</td>
      <td>60% savings</td>
      <td>IoT devices</td>
    </tr>
    <tr>
      <td>Better Privacy</td>
      <td>Local processing</td>
      <td>Healthcare apps</td>
    </tr>
  </tbody>
</table>

<h2>💻 Code Snippet of the Week</h2>
<p>Here's a useful TypeScript utility for type-safe event handling:</p>
<pre><code class="language-typescript">// Type-safe event emitter
type EventMap = Record<string, any>;

class TypedEventEmitter<T extends EventMap> {
  private listeners = new Map<keyof T, Set<Function>>();

  on<K extends keyof T>(event: K, callback: (data: T[K]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  emit<K extends keyof T>(event: K, data: T[K]) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
}

// Usage
type Events = {
  userLogin: { userId: string; timestamp: Date };
  dataUpdate: { records: number };
};

const emitter = new TypedEventEmitter<Events>();
emitter.on('userLogin', (data) => {
  console.log(\`User \${data.userId} logged in\`);
});
</code></pre>

<h2>📚 Recommended Reading</h2>
<ul>
  <li>📖 <strong>Clean Architecture in TypeScript</strong> - Learn SOLID principles applied to modern TS projects</li>
  <li>🎨 <strong>Advanced CSS Layouts</strong> - Master Grid and Flexbox for complex interfaces</li>
  <li>⚡ <strong>Performance Optimization Guide</strong> - Make your web apps blazing fast</li>
</ul>

<blockquote>
<p><strong>💡 Pro Tip:</strong> Use the <code>satisfies</code> operator in TypeScript 4.9+ to ensure type safety while preserving literal types. It's a game-changer for config objects!</p>
</blockquote>

<h2>🎯 Upcoming Events</h2>
<ol>
  <li><strong>VueConf 2024</strong> - Dec 5-7, Amsterdam</li>
  <li><strong>TypeScript Summit</strong> - Dec 12, Online</li>
  <li><strong>React Advanced</strong> - Dec 15-16, London</li>
</ol>

<hr>

<h2>📬 Join Our Community</h2>
<p style="text-align: center;">
  Love this newsletter? Share it with your colleagues!<br>
  <strong>Follow us:</strong> <a href="#">Twitter</a> • <a href="#">GitHub</a> • <a href="#">Discord</a>
</p>

<p style="text-align: center; font-size: 12px; color: #666;">
  <em>You're receiving this because you subscribed at example.com<br>
  <a href="#">Unsubscribe</a> • <a href="#">Update preferences</a> • <a href="#">View in browser</a></em>
</p>`,
  },
  {
    id: "landing-page",
    name: "Landing Page",
    icon: "🚀",
    description: "Product landing page with features and CTA",
    content: `<h1 style="text-align: center;">⚡ TaskMaster Pro</h1>
<p style="text-align: center; font-size: 1.3em;">
  <strong>The Ultimate Project Management Tool for Modern Teams</strong><br>
  <em>Boost productivity by 10x with AI-powered task management</em>
</p>

<p style="text-align: center;">
  <strong>🎯 Start Free Trial</strong> • <strong>📹 Watch Demo</strong> • <strong>💬 Talk to Sales</strong>
</p>

<hr>

<h2 style="text-align: center;">✨ Why Teams Love TaskMaster Pro</h2>

<table>
  <thead>
    <tr>
      <th style="text-align: center;">Feature</th>
      <th style="text-align: center;">Benefit</th>
      <th style="text-align: center;">Result</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="text-align: center;">🤖 AI Assistant</td>
      <td>Smart task prioritization</td>
      <td><strong>Save 5hrs/week</strong></td>
    </tr>
    <tr>
      <td style="text-align: center;">🔄 Real-time Sync</td>
      <td>Instant collaboration</td>
      <td><strong>Zero conflicts</strong></td>
    </tr>
    <tr>
      <td style="text-align: center;">📊 Analytics</td>
      <td>Data-driven insights</td>
      <td><strong>30% faster delivery</strong></td>
    </tr>
    <tr>
      <td style="text-align: center;">🔐 Enterprise Security</td>
      <td>SOC 2 compliant</td>
      <td><strong>100% secure</strong></td>
    </tr>
  </tbody>
</table>

<h2>🎯 Key Features</h2>

<h3>1. 🤖 AI-Powered Smart Assistant</h3>
<p>Our intelligent AI analyzes your workflow and automatically:</p>
<ul>
  <li><strong>Prioritizes tasks</strong> based on deadlines, dependencies, and team capacity</li>
  <li><strong>Suggests optimal assignments</strong> by matching skills with requirements</li>
  <li><strong>Predicts bottlenecks</strong> before they impact your timeline</li>
  <li><strong>Generates status reports</strong> in seconds, not hours</li>
</ul>

<h3>2. 📊 Real-Time Collaboration</h3>
<p>Work together seamlessly with features designed for modern teams:</p>
<ul>
  <li><strong>Live cursors</strong> - See who's editing what in real-time</li>
  <li><strong>Instant notifications</strong> - Never miss important updates</li>
  <li><strong>Comment threads</strong> - Discuss tasks without leaving the board</li>
  <li><strong>Version history</strong> - Roll back changes with one click</li>
</ul>

<h3>3. 🔄 Seamless Integrations</h3>
<p>Connect with your favorite tools:</p>
<table>
  <thead>
    <tr>
      <th>Category</th>
      <th>Tools</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Communication</strong></td>
      <td>Slack, Teams, Discord</td>
    </tr>
    <tr>
      <td><strong>Development</strong></td>
      <td>GitHub, GitLab, Bitbucket</td>
    </tr>
    <tr>
      <td><strong>Design</strong></td>
      <td>Figma, Adobe XD, Sketch</td>
    </tr>
    <tr>
      <td><strong>Time Tracking</strong></td>
      <td>Toggl, Harvest, Clockify</td>
    </tr>
  </tbody>
</table>

<h2>💰 Simple, Transparent Pricing</h2>

<table>
  <thead>
    <tr>
      <th>Plan</th>
      <th>Price</th>
      <th>Features</th>
      <th>Best For</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Starter</strong></td>
      <td>$9/user/month</td>
      <td>Basic features, 5 projects</td>
      <td>Small teams</td>
    </tr>
    <tr>
      <td><strong>Professional</strong></td>
      <td>$19/user/month</td>
      <td>Advanced features, unlimited projects</td>
      <td>Growing teams</td>
    </tr>
    <tr>
      <td><strong>Enterprise</strong></td>
      <td>Custom</td>
      <td>Everything + priority support</td>
      <td>Large organizations</td>
    </tr>
  </tbody>
</table>

<blockquote>
<p><strong>🎁 Special Offer:</strong> Get 2 months free when you sign up for an annual plan! Use code <code>TASKMASTER2024</code> at checkout.</p>
</blockquote>

<h2>⭐ What Our Customers Say</h2>

<blockquote>
<p>"TaskMaster Pro transformed how our team works. We've cut meeting time by 50% and delivered projects 30% faster. The AI assistant is like having an extra project manager!"<br>
<strong>— Sarah Chen, CTO at TechCorp</strong></p>
</blockquote>

<blockquote>
<p>"The real-time collaboration features are game-changing. Our remote team feels more connected than ever. Setup took 10 minutes, and ROI was immediate."<br>
<strong>— Michael Johnson, Product Lead at StartupXYZ</strong></p>
</blockquote>

<h2>📈 Proven Results</h2>
<ul>
  <li>⚡ <strong>10x productivity increase</strong> on average</li>
  <li>⏱️ <strong>5+ hours saved</strong> per team member per week</li>
  <li>✅ <strong>95% task completion rate</strong> vs 67% industry average</li>
  <li>😊 <strong>4.9/5 customer satisfaction</strong> from 50,000+ users</li>
</ul>

<h2>🚀 Ready to Transform Your Workflow?</h2>
<p style="text-align: center; font-size: 1.2em;">
  <strong>Start your 14-day free trial today. No credit card required.</strong>
</p>

<p style="text-align: center;">
  <strong>🎯 Get Started Free</strong>
</p>

<hr>

<p style="text-align: center; font-size: 0.9em;">
  <strong>Questions?</strong> Chat with us • Email: <a href="mailto:hello@taskmaster.com">hello@taskmaster.com</a> • Call: 1-800-TASKPRO<br>
  <em>© 2024 TaskMaster Pro. All rights reserved. <a href="#">Privacy Policy</a> • <a href="#">Terms of Service</a></em>
</p>`,
  },
  {
    id: "portfolio",
    name: "Portfolio",
    icon: "💼",
    description: "Creative portfolio showcase",
    content: `<h1 style="text-align: center;">Alex Rivera</h1>
<p style="text-align: center; font-size: 1.2em;">
  <strong>Full-Stack Developer & UI/UX Designer</strong><br>
  <em>Crafting beautiful, functional digital experiences</em>
</p>

<p style="text-align: center;">
  🌐 <a href="https://alexrivera.dev" target="_blank">alexrivera.dev</a> • 
  📧 <a href="mailto:alex@example.com">alex@example.com</a> • 
  💼 <a href="https://linkedin.com" target="_blank">LinkedIn</a> • 
  💻 <a href="https://github.com" target="_blank">GitHub</a>
</p>

<hr>

<h2>👋 About Me</h2>
<p>I'm a passionate full-stack developer with 5+ years of experience building scalable web applications and delightful user interfaces. I specialize in <strong>Vue.js</strong>, <strong>React</strong>, <strong>Node.js</strong>, and <strong>TypeScript</strong>, with a keen eye for design and user experience.</p>

<p>My approach combines technical excellence with creative problem-solving. I believe great software is not just functional—it's <em>beautiful</em>, <em>intuitive</em>, and <em>delightful to use</em>.</p>

<h2>💼 Featured Projects</h2>

<h3>1. 🎨 DesignHub - Collaborative Design Platform</h3>
<p><strong>Role:</strong> Lead Developer | <strong>Year:</strong> 2024 | <strong>Status:</strong> Live in production</p>

<p><strong>Description:</strong><br>
A real-time collaborative design tool for teams, combining Figma's interface with Notion's flexibility. Built for 10,000+ monthly active users.</p>

<p><strong>Key Features:</strong></p>
<ul>
  <li>🔄 Real-time multiplayer editing with WebSocket synchronization</li>
  <li>🎨 Canvas-based vector graphics editor with 50+ drawing tools</li>
  <li>💬 Integrated comment threads and version control</li>
  <li>📱 Responsive design working across desktop, tablet, and mobile</li>
</ul>

<p><strong>Tech Stack:</strong></p>
<table>
  <thead>
    <tr>
      <th>Category</th>
      <th>Technologies</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Frontend</td>
      <td>Vue 3, TypeScript, Vite, Pinia</td>
    </tr>
    <tr>
      <td>Backend</td>
      <td>Node.js, Express, Socket.io, Redis</td>
    </tr>
    <tr>
      <td>Database</td>
      <td>PostgreSQL, MongoDB</td>
    </tr>
    <tr>
      <td>Infrastructure</td>
      <td>AWS, Docker, Kubernetes</td>
    </tr>
  </tbody>
</table>

<p><strong>Impact:</strong></p>
<ul>
  <li>📈 10,000+ monthly active users in first 6 months</li>
  <li>⚡ 99.9% uptime with sub-100ms latency</li>
  <li>⭐ 4.8/5 average user rating</li>
</ul>

<blockquote>
<p>"Alex built DesignHub from the ground up with exceptional attention to detail. The real-time features work flawlessly, and users love the intuitive interface."<br>
<strong>— Sarah Chen, Product Manager</strong></p>
</blockquote>

<hr>

<h3>2. 🛒 EcommerceNext - Modern Shopping Platform</h3>
<p><strong>Role:</strong> Senior Frontend Developer | <strong>Year:</strong> 2023 | <strong>Status:</strong> Enterprise client</p>

<p><strong>Description:</strong><br>
High-performance e-commerce platform handling 1M+ monthly transactions. Features advanced search, personalized recommendations, and seamless checkout.</p>

<p><strong>Achievements:</strong></p>
<ul>
  <li>🚀 Reduced page load time by 60% through code splitting and lazy loading</li>
  <li>💰 Increased conversion rate by 25% with optimized checkout flow</li>
  <li>📱 Achieved 95+ Lighthouse score on mobile devices</li>
  <li>♿ Full WCAG 2.1 AA accessibility compliance</li>
</ul>

<p><strong>Technologies:</strong> React, Next.js, TypeScript, Tailwind CSS, GraphQL, Stripe API</p>

<hr>

<h3>3. 📊 DataViz Pro - Analytics Dashboard</h3>
<p><strong>Role:</strong> Full-Stack Developer | <strong>Year:</strong> 2023 | <strong>Status:</strong> SaaS product</p>

<p><strong>Description:</strong><br>
Interactive analytics dashboard with real-time data visualization, custom report builder, and AI-powered insights.</p>

<p><strong>Highlights:</strong></p>
<ul>
  <li>📈 20+ chart types with D3.js and custom WebGL renderer</li>
  <li>🤖 Machine learning integration for predictive analytics</li>
  <li>📊 Handles datasets with 1M+ rows without performance degradation</li>
  <li>🔐 Enterprise-grade security with role-based access control</li>
</ul>

<p><strong>Technologies:</strong> Vue 3, TypeScript, D3.js, Python (FastAPI), TensorFlow, PostgreSQL</p>

<h2>🛠️ Technical Skills</h2>

<table>
  <thead>
    <tr>
      <th>Category</th>
      <th>Skills</th>
      <th>Proficiency</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Frontend</strong></td>
      <td>Vue.js, React, TypeScript, HTML5, CSS3</td>
      <td>⭐⭐⭐⭐⭐</td>
    </tr>
    <tr>
      <td><strong>Backend</strong></td>
      <td>Node.js, Express, Python, FastAPI</td>
      <td>⭐⭐⭐⭐⭐</td>
    </tr>
    <tr>
      <td><strong>Database</strong></td>
      <td>PostgreSQL, MongoDB, Redis</td>
      <td>⭐⭐⭐⭐</td>
    </tr>
    <tr>
      <td><strong>DevOps</strong></td>
      <td>Docker, Kubernetes, AWS, CI/CD</td>
      <td>⭐⭐⭐⭐</td>
    </tr>
    <tr>
      <td><strong>Design</strong></td>
      <td>Figma, Adobe XD, UI/UX principles</td>
      <td>⭐⭐⭐⭐</td>
    </tr>
  </tbody>
</table>

<h2>🎓 Education & Certifications</h2>
<ul>
  <li>🎓 <strong>B.S. Computer Science</strong> - Stanford University (2019)</li>
  <li>📜 <strong>AWS Certified Solutions Architect</strong> (2023)</li>
  <li>📜 <strong>Google UX Design Professional Certificate</strong> (2022)</li>
</ul>

<h2>📝 Writing & Speaking</h2>
<ul>
  <li>📰 <strong>Tech Blog:</strong> Published 50+ articles on Vue.js and TypeScript (10K+ monthly readers)</li>
  <li>🎤 <strong>VueConf 2023:</strong> "Building Real-time Applications with Vue 3"</li>
  <li>🎥 <strong>YouTube Channel:</strong> Tutorial videos with 25K+ subscribers</li>
</ul>

<h2>🏆 Awards & Recognition</h2>
<ul>
  <li>🥇 <strong>Winner</strong> - HackathonX 2024 (Best Full-Stack Project)</li>
  <li>⭐ <strong>GitHub Star</strong> - 10K+ stars across open source projects</li>
  <li>🎖️ <strong>Top Contributor</strong> - Vue.js ecosystem (2023)</li>
</ul>

<h2>📬 Let's Connect!</h2>
<p>I'm always interested in hearing about new projects and opportunities. Whether you need a developer, want to collaborate, or just want to chat about tech—let's connect!</p>

<p style="text-align: center; font-size: 1.1em;">
  📧 <strong><a href="mailto:alex@example.com">alex@example.com</a></strong><br>
  📱 <strong>+1 (555) 123-4567</strong><br>
  📍 <strong>San Francisco, CA</strong>
</p>

<hr>

<p style="text-align: center; font-size: 0.9em;">
  <em>© 2024 Alex Rivera • Available for freelance projects and full-time opportunities</em>
</p>`,
  },
  {
    id: "resume",
    name: "Resume/CV",
    icon: "👤",
    description: "Professional resume template",
    content: `<h1 style="text-align: center;">MARIA SANTOS</h1>
<p style="text-align: center;">
  Senior Software Engineer<br>
  📧 maria.santos@email.com • 📱 +1 (555) 987-6543 • 📍 New York, NY<br>
  💼 <a href="https://linkedin.com/in/mariasantos" target="_blank">LinkedIn</a> • 
  💻 <a href="https://github.com/mariasantos" target="_blank">GitHub</a> • 
  🌐 <a href="https://mariasantos.dev" target="_blank">Portfolio</a>
</p>

<hr>

<h2>🎯 PROFESSIONAL SUMMARY</h2>
<p>Results-driven Senior Software Engineer with <strong>8+ years</strong> of experience building scalable web applications and leading high-performing teams. Expert in <strong>JavaScript/TypeScript</strong>, <strong>React</strong>, <strong>Vue.js</strong>, and <strong>Node.js</strong>. Proven track record of delivering mission-critical features that improve user experience and drive business growth. Passionate about clean code, mentorship, and continuous learning.</p>

<h2>💼 WORK EXPERIENCE</h2>

<h3>Senior Software Engineer | TechCorp Inc.</h3>
<p><em>January 2021 - Present • New York, NY</em></p>
<ul>
  <li>Lead development of customer-facing dashboard serving <strong>500K+ monthly users</strong>, resulting in 40% increase in user engagement</li>
  <li>Architected and implemented microservices backend using <strong>Node.js</strong> and <strong>PostgreSQL</strong>, improving API response time by 60%</li>
  <li>Mentor team of 5 junior developers, conducting code reviews and pair programming sessions</li>
  <li>Reduced production bugs by 45% through implementation of comprehensive testing strategy (Jest, Cypress, Playwright)</li>
  <li>Spearheaded migration from JavaScript to <strong>TypeScript</strong>, improving code quality and developer productivity</li>
</ul>

<h3>Full-Stack Developer | StartupXYZ</h3>
<p><em>March 2019 - December 2020 • San Francisco, CA</em></p>
<ul>
  <li>Built real-time collaboration features using <strong>WebSocket</strong> and <strong>Redis</strong>, supporting 10K+ concurrent users</li>
  <li>Developed RESTful APIs with <strong>Express.js</strong> and <strong>MongoDB</strong>, handling 1M+ requests per day</li>
  <li>Implemented CI/CD pipeline using <strong>GitHub Actions</strong> and <strong>Docker</strong>, reducing deployment time by 70%</li>
  <li>Optimized application performance, achieving <strong>95+ Lighthouse score</strong> across all metrics</li>
</ul>

<h3>Frontend Developer | Digital Agency</h3>
<p><em>June 2017 - February 2019 • Boston, MA</em></p>
<ul>
  <li>Developed responsive websites for 20+ clients using <strong>React</strong>, <strong>Vue.js</strong>, and modern CSS frameworks</li>
  <li>Created reusable component library, reducing development time by 30%</li>
  <li>Collaborated with designers to translate Figma mockups into pixel-perfect implementations</li>
  <li>Improved website accessibility to meet <strong>WCAG 2.1 AA</strong> standards</li>
</ul>

<h2>🛠️ TECHNICAL SKILLS</h2>

<table>
  <thead>
    <tr>
      <th>Category</th>
      <th>Technologies</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Languages</strong></td>
      <td>JavaScript, TypeScript, Python, SQL, HTML5, CSS3</td>
    </tr>
    <tr>
      <td><strong>Frontend</strong></td>
      <td>React, Vue.js, Next.js, Nuxt.js, Tailwind CSS, Sass</td>
    </tr>
    <tr>
      <td><strong>Backend</strong></td>
      <td>Node.js, Express, NestJS, FastAPI, GraphQL, REST APIs</td>
    </tr>
    <tr>
      <td><strong>Databases</strong></td>
      <td>PostgreSQL, MongoDB, Redis, MySQL</td>
    </tr>
    <tr>
      <td><strong>DevOps</strong></td>
      <td>Docker, Kubernetes, AWS, GitHub Actions, Jenkins</td>
    </tr>
    <tr>
      <td><strong>Testing</strong></td>
      <td>Jest, Vitest, Cypress, Playwright, React Testing Library</td>
    </tr>
    <tr>
      <td><strong>Tools</strong></td>
      <td>Git, VS Code, Figma, Jira, Postman</td>
    </tr>
  </tbody>
</table>

<h2>🎓 EDUCATION</h2>

<h3>Master of Science in Computer Science</h3>
<p><strong>Massachusetts Institute of Technology (MIT)</strong><br>
<em>2015 - 2017 • GPA: 3.9/4.0</em></p>
<ul>
  <li>Thesis: "Optimizing Real-Time Data Processing in Distributed Systems"</li>
  <li>Relevant Coursework: Algorithms, Distributed Systems, Machine Learning, Web Development</li>
</ul>

<h3>Bachelor of Science in Software Engineering</h3>
<p><strong>University of California, Berkeley</strong><br>
<em>2011 - 2015 • GPA: 3.8/4.0 • Summa Cum Laude</em></p>

<h2>📜 CERTIFICATIONS</h2>
<ul>
  <li>🏆 <strong>AWS Certified Solutions Architect - Professional</strong> (2023)</li>
  <li>🏆 <strong>Google Cloud Professional Developer</strong> (2022)</li>
  <li>🏆 <strong>Certified Kubernetes Administrator (CKA)</strong> (2022)</li>
</ul>

<h2>🚀 NOTABLE PROJECTS</h2>

<h3>Open Source Contributions</h3>
<ul>
  <li><strong>Vue.js Core</strong> - Contributed 10+ PRs to Vue.js 3, focusing on TypeScript improvements</li>
  <li><strong>React Query</strong> - Maintained documentation and fixed bugs</li>
  <li><strong>next-level-editor</strong> - Created popular WYSIWYG editor (5K+ GitHub stars)</li>
</ul>

<h3>Side Projects</h3>
<ul>
  <li><strong>DevTools Pro</strong> - Chrome extension for developers (10K+ active users)</li>
  <li><strong>Code Review Bot</strong> - AI-powered code review tool using GPT-4</li>
</ul>

<h2>🏆 AWARDS & RECOGNITION</h2>
<ul>
  <li>🥇 <strong>Employee of the Year</strong> - TechCorp Inc. (2023)</li>
  <li>🥇 <strong>Hackathon Winner</strong> - Built AI-powered debugging tool in 24 hours (2022)</li>
  <li>⭐ <strong>Top 1% Contributor</strong> - Stack Overflow (50K+ reputation)</li>
</ul>

<h2>📚 PUBLICATIONS & SPEAKING</h2>
<ul>
  <li>📝 <strong>"Building Scalable Microservices with Node.js"</strong> - Published in Dev.to (5K+ views)</li>
  <li>🎤 <strong>React Conference 2023</strong> - "State Management in 2023: What's New?"</li>
  <li>🎥 <strong>Tech YouTube Channel</strong> - 15K+ subscribers, 500K+ total views</li>
</ul>

<h2>💬 LANGUAGES</h2>
<ul>
  <li><strong>English</strong> - Native</li>
  <li><strong>Spanish</strong> - Fluent</li>
  <li><strong>Portuguese</strong> - Conversational</li>
</ul>

<hr>

<p style="text-align: center; font-size: 0.85em;">
  <em>References available upon request</em>
</p>`,
  },
  {
    id: "case-study",
    name: "Case Study",
    icon: "📊",
    description: "Professional case study template",
    content: `<h1 style="text-align: center;">Case Study: E-Commerce Platform Redesign</h1>
<p style="text-align: center;"><strong>How We Increased Conversion Rate by 156% in 3 Months</strong></p>

<hr>

<h2>📋 Executive Summary</h2>
<table>
  <tbody>
    <tr>
      <td><strong>Client</strong></td>
      <td>FashionHub - Online Retail Platform</td>
    </tr>
    <tr>
      <td><strong>Industry</strong></td>
      <td>E-Commerce / Fashion Retail</td>
    </tr>
    <tr>
      <td><strong>Project Duration</strong></td>
      <td>3 Months (Jan - Mar 2024)</td>
    </tr>
    <tr>
      <td><strong>Team Size</strong></td>
      <td>8 Members (2 Designers, 4 Developers, 1 PM, 1 QA)</td>
    </tr>
    <tr>
      <td><strong>Budget</strong></td>
      <td>$150,000</td>
    </tr>
  </tbody>
</table>

<blockquote>
<p><strong>Result:</strong> Achieved 156% increase in conversion rate, 89% improvement in page load speed, and 45% reduction in cart abandonment rate.</p>
</blockquote>

<h2>🎯 The Challenge</h2>

<h3>Business Context</h3>
<p>FashionHub, an online fashion retailer with 500K monthly visitors, was struggling with:</p>
<ul>
  <li><strong>Low conversion rate</strong> - Only 1.2% of visitors were making purchases</li>
  <li><strong>High cart abandonment</strong> - 78% of users abandoned their carts</li>
  <li><strong>Poor mobile experience</strong> - 65% of traffic was mobile, but mobile sales were only 20%</li>
  <li><strong>Slow page load times</strong> - Average load time of 8.5 seconds</li>
  <li><strong>Outdated design</strong> - UI hadn't been updated in 4 years</li>
</ul>

<h3>Key Problems Identified</h3>
<table>
  <thead>
    <tr>
      <th>Problem</th>
      <th>Impact</th>
      <th>Priority</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Confusing navigation</td>
      <td>Users couldn't find products</td>
      <td>🔴 Critical</td>
    </tr>
    <tr>
      <td>Complex checkout process</td>
      <td>5-step checkout → high abandonment</td>
      <td>🔴 Critical</td>
    </tr>
    <tr>
      <td>Poor image quality</td>
      <td>Low trust, high returns</td>
      <td>🟡 High</td>
    </tr>
    <tr>
      <td>No size guide</td>
      <td>Frequent returns (40% rate)</td>
      <td>🟡 High</td>
    </tr>
    <tr>
      <td>Limited payment options</td>
      <td>Lost international customers</td>
      <td>🟢 Medium</td>
    </tr>
  </tbody>
</table>

<h2>🔍 Research & Discovery</h2>

<h3>User Research Methods</h3>
<ol>
  <li><strong>User Interviews</strong> - Conducted 25 interviews with current and past customers</li>
  <li><strong>Heatmap Analysis</strong> - Analyzed 50K+ sessions using Hotjar</li>
  <li><strong>A/B Testing</strong> - Tested 15 different variations of key pages</li>
  <li><strong>Competitor Analysis</strong> - Studied 10 leading fashion e-commerce sites</li>
  <li><strong>Analytics Deep Dive</strong> - Examined 6 months of Google Analytics data</li>
</ol>

<h3>Key Insights</h3>
<blockquote>
<p>"I gave up trying to find the size chart. It took 3 clicks just to see it, and by then I'd lost interest."<br>
<strong>— Sarah, 28, Frequent online shopper</strong></p>
</blockquote>

<blockquote>
<p>"The checkout process felt endless. Why do I need to create an account just to buy a shirt?"<br>
<strong>— Michael, 35, First-time visitor</strong></p>
</blockquote>

<ul>
  <li>📊 <strong>85% of users</strong> wanted guest checkout option</li>
  <li>🎨 <strong>72% of users</strong> found the design outdated and untrustworthy</li>
  <li>📱 <strong>90% of mobile users</strong> complained about difficult navigation</li>
  <li>⏱️ <strong>68% of users</strong> left due to slow page loads</li>
</ul>

<h2>💡 The Solution</h2>

<h3>Design Strategy</h3>
<p>We adopted a <strong>mobile-first</strong>, <strong>user-centered</strong> approach with three main pillars:</p>

<ol>
  <li><strong>Simplification</strong> - Reduce friction at every touchpoint</li>
  <li><strong>Speed</strong> - Optimize for sub-3-second load times</li>
  <li><strong>Trust</strong> - Build confidence through design and social proof</li>
</ol>

<h3>Key Features Implemented</h3>

<h4>1. 🛒 Streamlined Checkout (5 steps → 1 step)</h4>
<ul>
  <li>Guest checkout option (no account required)</li>
  <li>Auto-fill address suggestions</li>
  <li>One-page checkout with real-time validation</li>
  <li>Multiple payment options (PayPal, Apple Pay, Google Pay, Buy Now Pay Later)</li>
</ul>

<h4>2. 📱 Mobile-First Redesign</h4>
<ul>
  <li>Touch-optimized interface with larger tap targets</li>
  <li>Bottom navigation for easier thumb reach</li>
  <li>Swipeable product galleries</li>
  <li>Sticky "Add to Cart" button</li>
</ul>

<h4>3. 🎨 Visual Improvements</h4>
<ul>
  <li>High-resolution product images with 360° view</li>
  <li>Video demonstrations for key products</li>
  <li>AI-powered size recommendations</li>
  <li>Virtual try-on using AR</li>
</ul>

<h4>4. ⚡ Performance Optimization</h4>
<ul>
  <li>Lazy loading for images and videos</li>
  <li>Code splitting and tree shaking</li>
  <li>CDN implementation for static assets</li>
  <li>Server-side rendering for critical pages</li>
</ul>

<h3>Technical Stack</h3>
<table>
  <thead>
    <tr>
      <th>Layer</th>
      <th>Technology</th>
      <th>Why We Chose It</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Frontend</td>
      <td>Next.js + TypeScript</td>
      <td>SSR for SEO, TypeScript for reliability</td>
    </tr>
    <tr>
      <td>UI Framework</td>
      <td>Tailwind CSS</td>
      <td>Rapid prototyping, consistent design</td>
    </tr>
    <tr>
      <td>State Management</td>
      <td>Zustand</td>
      <td>Lightweight, minimal boilerplate</td>
    </tr>
    <tr>
      <td>Backend</td>
      <td>Node.js + Express</td>
      <td>Fast API development, existing expertise</td>
    </tr>
    <tr>
      <td>Database</td>
      <td>PostgreSQL + Redis</td>
      <td>Reliable data storage + caching</td>
    </tr>
    <tr>
      <td>Hosting</td>
      <td>Vercel + AWS</td>
      <td>Edge functions, global CDN</td>
    </tr>
  </tbody>
</table>

<h2>📈 Results & Impact</h2>

<h3>Key Metrics (3 Months Post-Launch)</h3>
<table>
  <thead>
    <tr>
      <th>Metric</th>
      <th>Before</th>
      <th>After</th>
      <th>Change</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Conversion Rate</strong></td>
      <td>1.2%</td>
      <td>3.07%</td>
      <td>🟢 +156%</td>
    </tr>
    <tr>
      <td><strong>Cart Abandonment</strong></td>
      <td>78%</td>
      <td>43%</td>
      <td>🟢 -45%</td>
    </tr>
    <tr>
      <td><strong>Page Load Time</strong></td>
      <td>8.5s</td>
      <td>1.9s</td>
      <td>🟢 -78%</td>
    </tr>
    <tr>
      <td><strong>Mobile Conversion</strong></td>
      <td>0.8%</td>
      <td>2.9%</td>
      <td>🟢 +262%</td>
    </tr>
    <tr>
      <td><strong>Return Rate</strong></td>
      <td>40%</td>
      <td>18%</td>
      <td>🟢 -55%</td>
    </tr>
    <tr>
      <td><strong>Customer Satisfaction</strong></td>
      <td>3.2/5</td>
      <td>4.7/5</td>
      <td>🟢 +47%</td>
    </tr>
  </tbody>
</table>

<h3>Business Impact</h3>
<ul>
  <li>💰 <strong>$2.4M additional revenue</strong> in first quarter post-launch</li>
  <li>📈 <strong>89% increase</strong> in average order value</li>
  <li>👥 <strong>125% growth</strong> in new customer acquisition</li>
  <li>⭐ <strong>4.7/5 average rating</strong> (up from 3.2/5)</li>
  <li>🔄 <strong>67% repeat purchase rate</strong> (up from 31%)</li>
</ul>

<blockquote>
<p>"The new platform transformed our business. We've seen record sales every month since launch, and customer feedback has been overwhelmingly positive."<br>
<strong>— Jennifer Lee, CEO of FashionHub</strong></p>
</blockquote>

<h2>📚 Lessons Learned</h2>

<h3>What Worked Well ✅</h3>
<ul>
  <li>Mobile-first approach paid off massively</li>
  <li>User research guided all design decisions</li>
  <li>Iterative A/B testing validated our hypotheses</li>
  <li>Cross-functional collaboration was key to success</li>
</ul>

<h3>Challenges Faced ⚠️</h3>
<ul>
  <li>Legacy system integration took longer than expected</li>
  <li>Initial resistance to removing features (even unused ones)</li>
  <li>Balancing aesthetics with performance was challenging</li>
</ul>

<h3>Key Takeaways 💡</h3>
<ol>
  <li><strong>Speed matters</strong> - Every second of load time costs conversions</li>
  <li><strong>Simplicity wins</strong> - Reducing checkout from 5 to 1 step was game-changing</li>
  <li><strong>Mobile-first isn't optional</strong> - It's where your customers are</li>
  <li><strong>Test everything</strong> - Data beats opinions every time</li>
</ol>

<h2>🚀 What's Next</h2>
<p>Based on the success of this project, FashionHub is now working on:</p>
<ul>
  <li>AI-powered personal stylist feature</li>
  <li>Social shopping integration</li>
  <li>Subscription-based premium membership</li>
  <li>International expansion to 5 new markets</li>
</ul>

<hr>

<h2>📞 Interested in Similar Results?</h2>
<p style="text-align: center;">
  We'd love to hear about your challenges and how we can help.<br>
  <strong>Contact us:</strong> hello@designstudio.com • 📱 1-800-DESIGN
</p>

<p style="text-align: center; font-size: 0.9em;">
  <em>© 2024 Design Studio Inc. • All trademarks are property of their respective owners.</em>
</p>`,
  },
];

// Import media-rich examples
import { mediaExamples } from "./mediaExamples";

/**
 * Combined array of all example templates
 * Includes both basic examples and media-rich examples
 */
export const allExamples: ExampleTemplate[] = [
  ...exampleTemplates,
  ...mediaExamples,
];

export function getTemplateById(id: string): ExampleTemplate | undefined {
  return allExamples.find((template) => template.id === id);
}

export function getDefaultTemplate(): ExampleTemplate {
  return exampleTemplates[1]; // Return showcase template by default
}

/**
 * Get all available templates
 */
export function getAllTemplates(): ExampleTemplate[] {
  return allExamples;
}
