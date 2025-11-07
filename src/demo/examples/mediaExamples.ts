/**
 * Media-rich example templates for the Next Level Editor
 * These examples demonstrate image and video embedding capabilities
 */

import type { ExampleTemplate } from './exampleTemplates'

/**
 * Simple base64 encoded placeholder images for examples
 * These are minimal SVG placeholders to demonstrate image functionality
 */
export const placeholderImages = {
  product: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzY2N2VlYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+UHJvZHVjdCBJbWFnZTwvdGV4dD48L3N2Zz4=',
  travel: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iIzJlY2M3MSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjgiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+VHJhdmVsIFBob3RvPC90ZXh0Pjwvc3ZnPg==',
  recipe: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjM1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTAwIiBoZWlnaHQ9IjM1MCIgZmlsbD0iI2YzOWMxMiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjYiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+UmVjaXBlIEltYWdlPC90ZXh0Pjwvc3ZnPg==',
  portfolio: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzliNTliNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjIiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+UHJvZmlsZSBQaG90bzwvdGV4dD48L3N2Zz4=',
  screenshot: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNzAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iIzM0OThkYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMzAiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+U2NyZWVuc2hvdDwvdGV4dD48L3N2Zz4='
}

/**
 * Media-rich example templates
 */
export const mediaExamples: ExampleTemplate[] = [
  {
    id: 'product-showcase',
    name: 'Product Showcase',
    icon: '🛍️',
    description: 'Product page with images and features',
    content: `<h1>Premium Wireless Headphones 🎧</h1>

<div style="text-align: center; margin: 20px 0;">
  <img src="${placeholderImages.product}" alt="Premium Wireless Headphones" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</div>

<h2>🌟 Key Features</h2>
<ul>
  <li><strong>Active Noise Cancellation</strong> - Block out the world and focus on your music</li>
  <li><strong>40-Hour Battery Life</strong> - Listen all week on a single charge</li>
  <li><strong>Premium Sound Quality</strong> - Studio-grade audio with deep bass</li>
  <li><strong>Comfortable Design</strong> - Soft ear cushions for all-day wear</li>
  <li><strong>Multi-Device Pairing</strong> - Connect to multiple devices simultaneously</li>
</ul>

<h2>📦 What's in the Box</h2>
<table>
  <thead>
    <tr>
      <th>Item</th>
      <th>Quantity</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Headphones</td>
      <td>1</td>
      <td>Main wireless headphone unit</td>
    </tr>
    <tr>
      <td>USB-C Cable</td>
      <td>1</td>
      <td>For charging (6ft length)</td>
    </tr>
    <tr>
      <td>Carrying Case</td>
      <td>1</td>
      <td>Premium hard shell case</td>
    </tr>
    <tr>
      <td>Audio Cable</td>
      <td>1</td>
      <td>3.5mm cable for wired mode</td>
    </tr>
  </tbody>
</table>

<h2>💰 Pricing</h2>
<p style="font-size: 2em; color: #667eea; font-weight: bold;">$299.99</p>
<p><em>Free shipping on orders over $50 • 30-day money-back guarantee</em></p>

<h2>⭐ Customer Reviews</h2>
<blockquote>
<p><strong>⭐⭐⭐⭐⭐</strong> "Best headphones I've ever owned! The noise cancellation is incredible and the battery lasts forever."</p>
<p><em>- Sarah M., Verified Buyer</em></p>
</blockquote>

<blockquote>
<p><strong>⭐⭐⭐⭐⭐</strong> "Amazing sound quality and super comfortable. I wear them for 8+ hours a day working from home."</p>
<p><em>- David L., Tech Professional</em></p>
</blockquote>

<h2>🎥 Product Demo Video</h2>
<p>Watch our comprehensive review and unboxing:</p>
<div class="video-container" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 20px 0;">
  <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allowfullscreen></iframe>
</div>

<h2>🚚 Shipping Information</h2>
<p>We offer <strong>free standard shipping</strong> on all orders over $50. Express shipping options available at checkout.</p>
<ul>
  <li><strong>Standard Shipping</strong>: 5-7 business days</li>
  <li><strong>Express Shipping</strong>: 2-3 business days</li>
  <li><strong>Overnight</strong>: Next business day</li>
</ul>

<p style="text-align: center; margin-top: 30px;">
  <strong>Ready to upgrade your audio experience?</strong><br>
  <a href="#" style="display: inline-block; background: #667eea; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px;">Add to Cart</a>
</p>`
  },
  {
    id: 'travel-blog',
    name: 'Travel Blog',
    icon: '✈️',
    description: 'Travel article with photos and tips',
    content: `<h1>7 Days in Tokyo: A Complete Travel Guide 🗾</h1>
<p><em>Published on November 7, 2024 • 12 min read • Travel Guide</em></p>

<div style="text-align: center; margin: 30px 0;">
  <img src="${placeholderImages.travel}" alt="Tokyo skyline at sunset" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
  <p style="font-style: italic; color: #666; margin-top: 10px;">Tokyo skyline at sunset - a city where tradition meets innovation</p>
</div>

<p>Tokyo is a city of contrasts, where ancient temples stand alongside futuristic skyscrapers, and traditional tea ceremonies coexist with cutting-edge technology. Having spent a week exploring this incredible city, here's my complete guide to making the most of your Tokyo adventure.</p>

<h2>📍 Day 1-2: Exploring Central Tokyo</h2>

<h3>Shibuya & Harajuku</h3>
<p>Start your journey in <strong>Shibuya</strong>, home to the world's busiest pedestrian crossing. The energy here is electric, with thousands of people crossing simultaneously when the lights change.</p>

<p><strong>Must-visit spots:</strong></p>
<ul>
  <li>📸 Shibuya Crossing - Best viewed from the Starbucks overlooking the intersection</li>
  <li>🐕 Hachiko Statue - Famous meeting point and touching story</li>
  <li>🌈 Harajuku's Takeshita Street - Youth culture and fashion paradise</li>
  <li>🌳 Meiji Shrine - Peaceful oasis in the city center</li>
</ul>

<div style="background: #f8f9fb; border-left: 4px solid #2ecc71; padding: 16px; margin: 20px 0; border-radius: 4px;">
<p><strong>💡 Pro Tip:</strong> Visit Meiji Shrine early in the morning (around 6-7 AM) to experience it in peaceful solitude before the crowds arrive.</p>
</div>

<h2>🍜 Food Experiences You Can't Miss</h2>

<table>
  <thead>
    <tr>
      <th>Dish</th>
      <th>Where to Try</th>
      <th>Price Range</th>
      <th>Must-Order</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>🍣 Sushi</td>
      <td>Tsukiji Outer Market</td>
      <td>¥1,000-3,000</td>
      <td>Tuna belly (Otoro)</td>
    </tr>
    <tr>
      <td>🍜 Ramen</td>
      <td>Ichiran Shibuya</td>
      <td>¥1,000-1,500</td>
      <td>Tonkotsu ramen</td>
    </tr>
    <tr>
      <td>🥟 Gyoza</td>
      <td>Harajuku Gyozaro</td>
      <td>¥500-800</td>
      <td>Pan-fried gyoza set</td>
    </tr>
    <tr>
      <td>🍢 Yakitori</td>
      <td>Omoide Yokocho</td>
      <td>¥1,500-2,500</td>
      <td>Assorted skewers</td>
    </tr>
  </tbody>
</table>

<h2>🎌 Day 3-4: Traditional Tokyo</h2>

<h3>Asakusa & Senso-ji Temple</h3>
<p>Step back in time in <strong>Asakusa</strong>, Tokyo's traditional district. The magnificent <em>Senso-ji Temple</em> is Tokyo's oldest temple and a must-visit landmark.</p>

<blockquote>
<p>"Walking through the Nakamise shopping street leading to Senso-ji felt like traveling through time. The traditional shops, the smell of freshly made snacks, and the sight of people in kimonos made it an unforgettable experience."</p>
</blockquote>

<h2>🎥 Watch: Tokyo Travel Vlog</h2>
<p>Check out this comprehensive Tokyo travel guide video:</p>
<div class="video-container" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 20px 0;">
  <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allowfullscreen></iframe>
</div>

<h2>💰 Budget Breakdown</h2>

<pre><code>Average Daily Costs for Budget Travelers:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏨 Accommodation (Hostel):     ¥3,000-4,000
🍱 Meals (3 meals):            ¥2,500-4,000
🚇 Transportation (JR Pass):   ¥1,500-2,000
🎫 Attractions:                ¥1,000-2,000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total per day:                 ¥8,000-12,000
                               ($55-85 USD)
</code></pre>

<h2>🗺️ Essential Travel Tips</h2>

<ol>
  <li><strong>Get a Suica or Pasmo Card</strong> - Makes train travel seamless</li>
  <li><strong>Download Google Maps offline</strong> - Works perfectly in Tokyo</li>
  <li><strong>Learn basic Japanese phrases</strong> - People appreciate the effort</li>
  <li><strong>Cash is still king</strong> - Many places don't accept cards</li>
  <li><strong>Remove shoes indoors</strong> - Important cultural practice</li>
</ol>

<h2>📱 Useful Apps</h2>
<ul>
  <li>🚇 <strong>Hyperdia</strong> - Train route planning</li>
  <li>🗺️ <strong>Google Maps</strong> - Navigation and reviews</li>
  <li>💱 <strong>XE Currency</strong> - Real-time exchange rates</li>
  <li>📖 <strong>Google Translate</strong> - Camera translation is magic</li>
</ul>

<h2>🌸 Best Times to Visit</h2>
<p>While Tokyo is great year-round, these seasons are particularly special:</p>

<ul>
  <li><strong>Spring (March-May)</strong>: Cherry blossom season 🌸 - Absolutely magical but very crowded</li>
  <li><strong>Fall (October-November)</strong>: Comfortable weather and beautiful autumn colors 🍂</li>
  <li><strong>Winter (December-February)</strong>: Fewer tourists, winter illuminations ❄️</li>
</ul>

<hr>

<h3>Final Thoughts</h3>
<p>Tokyo exceeded all my expectations. It's a city that somehow manages to be both overwhelming and welcoming, chaotic and orderly, traditional and futuristic. Whether you're a first-time visitor or returning for another adventure, Tokyo always has something new to discover.</p>

<p><strong>Have you been to Tokyo? What were your favorite experiences?</strong> Share in the comments below! 💬</p>

<p style="text-align: center; margin-top: 30px; font-style: italic;">
Happy travels! 🌏✈️<br>
<em>- Your Travel Guide</em>
</p>`
  },
  {
    id: 'recipe',
    name: 'Recipe Card',
    icon: '🍳',
    description: 'Cooking recipe with step-by-step images',
    content: `<h1>Perfect Chocolate Chip Cookies 🍪</h1>

<div style="text-align: center; margin: 30px 0;">
  <img src="${placeholderImages.recipe}" alt="Freshly baked chocolate chip cookies" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</div>

<p><em>⏱️ Prep Time: 15 minutes • Cook Time: 12 minutes • Total Time: 27 minutes • Yield: 24 cookies</em></p>

<p>These are the <strong>best chocolate chip cookies</strong> you'll ever make! Crispy edges, chewy centers, and loaded with chocolate chips. This recipe has been perfected over years of testing and is guaranteed to become your go-to.</p>

<h2>📋 Ingredients</h2>

<h3>Dry Ingredients</h3>
<ul>
  <li>2 ¼ cups (280g) all-purpose flour</li>
  <li>1 tsp baking soda</li>
  <li>1 tsp salt</li>
  <li>2 cups (340g) chocolate chips</li>
</ul>

<h3>Wet Ingredients</h3>
<ul>
  <li>1 cup (230g) unsalted butter, softened</li>
  <li>¾ cup (150g) granulated sugar</li>
  <li>¾ cup (165g) packed brown sugar</li>
  <li>2 large eggs</li>
  <li>2 tsp pure vanilla extract</li>
</ul>

<div style="background: #fff3cd; border-left: 4px solid #f39c12; padding: 16px; margin: 20px 0; border-radius: 4px;">
<p><strong>🌟 Baker's Tip:</strong> For the absolute best results, let your cookie dough rest in the refrigerator for at least 2 hours (or up to 72 hours). This allows the flour to fully hydrate and develops a deeper, more complex flavor.</p>
</div>

<h2>👨‍🍳 Instructions</h2>

<h3>Step 1: Prepare Your Station</h3>
<ol>
  <li>Preheat oven to <strong>375°F (190°C)</strong></li>
  <li>Line baking sheets with parchment paper</li>
  <li>Take butter out to soften (should be room temperature)</li>
</ol>

<h3>Step 2: Mix Dry Ingredients</h3>
<ol>
  <li>In a medium bowl, whisk together flour, baking soda, and salt</li>
  <li>Set aside</li>
</ol>

<h3>Step 3: Cream Butter and Sugars</h3>
<ol>
  <li>In a large bowl, beat softened butter with both sugars until light and fluffy (about 3-4 minutes)</li>
  <li>This step is crucial - don't rush it!</li>
</ol>

<h3>Step 4: Add Wet Ingredients</h3>
<ol>
  <li>Beat in eggs one at a time</li>
  <li>Add vanilla extract and mix until combined</li>
</ol>

<h3>Step 5: Combine</h3>
<ol>
  <li>Gradually mix in the flour mixture on low speed</li>
  <li>Stop as soon as flour is incorporated</li>
  <li>Fold in chocolate chips with a spatula</li>
</ol>

<h3>Step 6: Chill (Optional but Recommended)</h3>
<ol>
  <li>Cover dough and refrigerate for 2-24 hours</li>
  <li>This step significantly improves flavor and texture</li>
</ol>

<h3>Step 7: Bake</h3>
<ol>
  <li>Scoop dough into 2-tablespoon portions</li>
  <li>Place 2 inches apart on prepared baking sheets</li>
  <li>Bake for <strong>10-12 minutes</strong> until edges are golden</li>
  <li>Centers should look slightly underdone - they'll continue cooking</li>
</ol>

<h3>Step 8: Cool</h3>
<ol>
  <li>Let cookies cool on baking sheet for 5 minutes</li>
  <li>Transfer to wire rack to cool completely</li>
</ol>

<h2>📊 Nutrition Information</h2>
<table>
  <thead>
    <tr>
      <th>Nutrient</th>
      <th>Per Cookie</th>
      <th>% Daily Value</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Calories</td>
      <td>180</td>
      <td>9%</td>
    </tr>
    <tr>
      <td>Fat</td>
      <td>9g</td>
      <td>12%</td>
    </tr>
    <tr>
      <td>Carbohydrates</td>
      <td>24g</td>
      <td>8%</td>
    </tr>
    <tr>
      <td>Protein</td>
      <td>2g</td>
      <td>4%</td>
    </tr>
    <tr>
      <td>Sugar</td>
      <td>15g</td>
      <td>-</td>
    </tr>
  </tbody>
</table>

<h2>🎥 Video Tutorial</h2>
<p>Watch the step-by-step video guide:</p>
<div class="video-container" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 20px 0;">
  <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allowfullscreen></iframe>
</div>

<h2>💡 Pro Tips for Perfect Cookies</h2>

<table>
  <thead>
    <tr>
      <th>Tip</th>
      <th>Why It Matters</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Room temperature butter</strong></td>
      <td>Creates proper texture - should leave indent when pressed</td>
    </tr>
    <tr>
      <td><strong>Don't overmix</strong></td>
      <td>Overmixing develops gluten, making cookies tough</td>
    </tr>
    <tr>
      <td><strong>Chill the dough</strong></td>
      <td>Prevents spreading and intensifies flavor</td>
    </tr>
    <tr>
      <td><strong>Slightly underbake</strong></td>
      <td>Cookies continue cooking after removal - keeps centers soft</td>
    </tr>
    <tr>
      <td><strong>Use parchment paper</strong></td>
      <td>Prevents sticking and promotes even browning</td>
    </tr>
  </tbody>
</table>

<h2>🔄 Variations to Try</h2>
<ul>
  <li>🌰 <strong>Nutty Delight</strong>: Add 1 cup chopped walnuts or pecans</li>
  <li>🍫 <strong>Double Chocolate</strong>: Replace ½ cup flour with cocoa powder</li>
  <li>🧂 <strong>Sea Salt</strong>: Sprinkle flaky sea salt on top before baking</li>
  <li>🌶️ <strong>Spicy</strong>: Add ½ tsp cayenne pepper for a kick</li>
  <li>🍊 <strong>Citrus Twist</strong>: Add 1 tbsp orange zest to dough</li>
</ul>

<h2>📦 Storage Instructions</h2>

<div style="background: #d4edda; border-left: 4px solid #2ecc71; padding: 16px; margin: 20px 0; border-radius: 4px;">
<p><strong>✅ Storage Tips:</strong></p>
<ul style="margin-bottom: 0;">
  <li><strong>Room Temperature</strong>: Store in airtight container for up to 5 days</li>
  <li><strong>Refrigerator</strong>: Keep fresh for up to 2 weeks</li>
  <li><strong>Freezer (Baked)</strong>: Freeze for up to 3 months, thaw at room temp</li>
  <li><strong>Freezer (Dough)</strong>: Freeze scooped dough balls for up to 3 months, bake from frozen (add 2 minutes)</li>
</ul>
</div>

<h2>❓ Troubleshooting</h2>

<h3>Why are my cookies flat?</h3>
<ul>
  <li>Butter was too warm - ensure it's just softened, not melted</li>
  <li>Didn't chill dough - try refrigerating for at least 2 hours</li>
  <li>Too much sugar - measure accurately using the spoon-and-level method</li>
</ul>

<h3>Why are my cookies too cakey?</h3>
<ul>
  <li>Too much flour - don't pack the measuring cup</li>
  <li>Not enough butter or sugar</li>
  <li>Overbaked - remove when edges are golden but centers look slightly underdone</li>
</ul>

<blockquote>
<p><strong>⭐⭐⭐⭐⭐</strong> "These are hands down the best chocolate chip cookies I've ever made! The tip about chilling the dough really does make a difference. My family devoured them in one evening!" - <em>Sarah K.</em></p>
</blockquote>

<hr>

<p style="text-align: center; margin-top: 30px;">
<strong>🍪 Enjoy your delicious homemade cookies! 🍪</strong><br>
<em>Share your baking results with us using #PerfectCookies</em>
</p>`
  },
  {
    id: 'portfolio',
    name: 'Portfolio/Resume',
    icon: '👔',
    description: 'Professional portfolio with profile image',
    content: `<h1>Jane Smith - Full Stack Developer 💻</h1>

<div style="text-align: center; margin: 30px 0;">
  <img src="${placeholderImages.portfolio}" alt="Jane Smith - Profile Photo" style="max-width: 300px; border-radius: 50%; box-shadow: 0 4px 16px rgba(0,0,0,0.2);" />
  <p style="margin-top: 20px; font-size: 1.2em;"><strong>Software Engineer | Open Source Contributor | Tech Blogger</strong></p>
  <p>
    <a href="mailto:jane.smith@example.com">📧 jane.smith@example.com</a> • 
    <a href="https://github.com/janesmith" target="_blank">🐙 GitHub</a> • 
    <a href="https://linkedin.com/in/janesmith" target="_blank">💼 LinkedIn</a> • 
    <a href="https://janesmith.dev" target="_blank">🌐 Website</a>
  </p>
</div>

<h2>👋 About Me</h2>
<p>I'm a passionate <strong>Full Stack Developer</strong> with 5+ years of experience building scalable web applications. I love creating elegant solutions to complex problems and contributing to open-source projects. When I'm not coding, you'll find me writing technical blog posts or mentoring junior developers.</p>

<h2>💼 Professional Experience</h2>

<h3>Senior Software Engineer - TechCorp Inc.</h3>
<p><em>San Francisco, CA • January 2022 - Present</em></p>
<ul>
  <li>Lead development of microservices architecture serving <strong>5M+ daily users</strong></li>
  <li>Reduced API response time by <strong>60%</strong> through optimization and caching strategies</li>
  <li>Mentor team of 5 junior developers, conducting code reviews and pair programming sessions</li>
  <li>Implemented CI/CD pipeline reducing deployment time from hours to <strong>15 minutes</strong></li>
</ul>

<h3>Full Stack Developer - StartupXYZ</h3>
<p><em>Remote • June 2019 - December 2021</em></p>
<ul>
  <li>Built and maintained customer-facing web application using <strong>React, Node.js, and PostgreSQL</strong></li>
  <li>Developed RESTful APIs handling <strong>1M+ requests per day</strong></li>
  <li>Improved application performance resulting in <strong>40% faster page load times</strong></li>
  <li>Collaborated with design team to implement responsive, accessible UI components</li>
</ul>

<h3>Junior Developer - WebSolutions LLC</h3>
<p><em>New York, NY • September 2018 - May 2019</em></p>
<ul>
  <li>Developed features for e-commerce platform using <strong>Vue.js and Laravel</strong></li>
  <li>Fixed critical bugs and improved code quality through comprehensive testing</li>
  <li>Participated in daily standups and sprint planning meetings</li>
</ul>

<h2>🛠️ Technical Skills</h2>

<table>
  <thead>
    <tr>
      <th>Category</th>
      <th>Technologies</th>
      <th>Proficiency</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Frontend</strong></td>
      <td>React, Vue.js, TypeScript, HTML/CSS, Tailwind CSS</td>
      <td>⭐⭐⭐⭐⭐</td>
    </tr>
    <tr>
      <td><strong>Backend</strong></td>
      <td>Node.js, Python, Express, Django, REST APIs</td>
      <td>⭐⭐⭐⭐⭐</td>
    </tr>
    <tr>
      <td><strong>Database</strong></td>
      <td>PostgreSQL, MongoDB, Redis, MySQL</td>
      <td>⭐⭐⭐⭐</td>
    </tr>
    <tr>
      <td><strong>DevOps</strong></td>
      <td>Docker, Kubernetes, AWS, CI/CD, GitHub Actions</td>
      <td>⭐⭐⭐⭐</td>
    </tr>
    <tr>
      <td><strong>Testing</strong></td>
      <td>Jest, Vitest, Playwright, Cypress, PyTest</td>
      <td>⭐⭐⭐⭐⭐</td>
    </tr>
    <tr>
      <td><strong>Tools</strong></td>
      <td>Git, VS Code, Jira, Figma, Postman</td>
      <td>⭐⭐⭐⭐⭐</td>
    </tr>
  </tbody>
</table>

<h2>🚀 Featured Projects</h2>

<h3>1. TaskMaster Pro - Project Management Tool</h3>
<p><a href="https://github.com/janesmith/taskmaster-pro" target="_blank">🔗 View on GitHub</a> • <a href="https://taskmaster-pro.com" target="_blank">🌐 Live Demo</a></p>
<p>A comprehensive project management application built with <strong>React, Node.js, and PostgreSQL</strong>.</p>
<ul>
  <li>✅ Real-time collaboration with WebSocket support</li>
  <li>✅ Drag-and-drop task management interface</li>
  <li>✅ Advanced analytics and reporting dashboard</li>
  <li>✅ <strong>2,500+ GitHub stars</strong></li>
</ul>

<h3>2. DevBlog - Technical Blogging Platform</h3>
<p><a href="https://github.com/janesmith/devblog" target="_blank">🔗 View on GitHub</a></p>
<p>A markdown-based blogging platform with syntax highlighting for developers.</p>
<ul>
  <li>✅ Built with <strong>Next.js and Tailwind CSS</strong></li>
  <li>✅ SEO-optimized with server-side rendering</li>
  <li>✅ Integrated comment system and user authentication</li>
  <li>✅ <strong>500+ active users</strong></li>
</ul>

<h3>3. API Monitor - Service Health Dashboard</h3>
<p><a href="https://github.com/janesmith/api-monitor" target="_blank">🔗 View on GitHub</a></p>
<p>Real-time monitoring dashboard for tracking API performance and uptime.</p>
<ul>
  <li>✅ Built with <strong>Vue.js and Python (FastAPI)</strong></li>
  <li>✅ Automated alerts via email and Slack</li>
  <li>✅ Comprehensive metrics and historical data visualization</li>
</ul>

<h2>🎓 Education</h2>

<h3>Bachelor of Science in Computer Science</h3>
<p><strong>University of Technology</strong> • <em>Graduated: May 2018</em></p>
<ul>
  <li>GPA: 3.8/4.0</li>
  <li>Dean's List - All Semesters</li>
  <li>Relevant Coursework: Data Structures, Algorithms, Database Systems, Web Development</li>
</ul>

<h2>📜 Certifications</h2>
<ul>
  <li>✅ <strong>AWS Certified Solutions Architect</strong> - Associate (2023)</li>
  <li>✅ <strong>MongoDB Certified Developer</strong> (2022)</li>
  <li>✅ <strong>Google Cloud Professional Developer</strong> (2021)</li>
</ul>

<h2>✍️ Recent Blog Posts</h2>
<ol>
  <li><a href="#" target="_blank">Building Scalable Microservices with Node.js and Docker</a> - 15,000 views</li>
  <li><a href="#" target="_blank">Optimizing React Performance: A Complete Guide</a> - 12,000 views</li>
  <li><a href="#" target="_blank">Introduction to TypeScript for JavaScript Developers</a> - 8,500 views</li>
</ol>

<h2>🎥 Conference Talks</h2>
<p>Watch my recent conference talk on modern web development:</p>
<div class="video-container" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 20px 0;">
  <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allowfullscreen></iframe>
</div>

<h2>🏆 Achievements & Recognition</h2>
<ul>
  <li>🥇 <strong>Hackathon Winner</strong> - TechCrunch Disrupt 2023</li>
  <li>⭐ <strong>Top Contributor</strong> - Vue.js Core Library (2022)</li>
  <li>📝 <strong>Featured Author</strong> - Dev.to (50,000+ followers)</li>
  <li>🎤 <strong>Speaker</strong> - ReactConf 2023, VueConf 2022</li>
</ul>

<h2>🌟 Open Source Contributions</h2>
<ul>
  <li><strong>Vue.js</strong> - Core team contributor, 50+ merged PRs</li>
  <li><strong>React</strong> - Documentation improvements and bug fixes</li>
  <li><strong>Vite</strong> - Plugin development and community support</li>
  <li><strong>TypeScript</strong> - Type definition contributions</li>
</ul>

<h2>💬 Testimonials</h2>

<blockquote>
<p>"Jane is an exceptional developer who consistently delivers high-quality code. Her ability to break down complex problems and mentor junior developers makes her an invaluable team member."</p>
<p><em>- Michael Chen, Engineering Manager at TechCorp</em></p>
</blockquote>

<blockquote>
<p>"Working with Jane was a game-changer for our project. Her expertise in React and Node.js helped us launch our MVP 3 weeks ahead of schedule."</p>
<p><em>- Sarah Johnson, CTO at StartupXYZ</em></p>
</blockquote>

<h2>📫 Let's Connect!</h2>
<p>I'm always interested in new opportunities and collaborations. Feel free to reach out if you'd like to discuss:</p>
<ul>
  <li>💼 Job opportunities</li>
  <li>🤝 Collaboration on open-source projects</li>
  <li>🎤 Speaking at conferences or meetups</li>
  <li>📝 Technical writing and guest blogging</li>
</ul>

<p style="text-align: center; margin-top: 40px; padding: 24px; background: #f8f9fb; border-radius: 8px;">
  <strong style="font-size: 1.3em;">Let's build something amazing together! 🚀</strong><br><br>
  📧 <a href="mailto:jane.smith@example.com">jane.smith@example.com</a><br>
  📱 +1 (555) 123-4567<br>
  📍 San Francisco, CA
</p>`
  },
  {
    id: 'tutorial',
    name: 'Tutorial Guide',
    icon: '📖',
    description: 'Step-by-step tutorial with screenshots and video',
    content: `<h1>Building Your First Vue.js App: Complete Tutorial 🚀</h1>

<div style="text-align: center; margin: 30px 0;">
  <img src="${placeholderImages.screenshot}" alt="Vue.js application screenshot" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</div>

<p><em>📚 Difficulty: Beginner • ⏱️ Time: 45 minutes • 🔧 Prerequisites: Basic HTML/CSS/JavaScript knowledge</em></p>

<p>Welcome to this comprehensive tutorial on building your first Vue.js application! By the end of this guide, you'll have created a fully functional todo list app with modern features and best practices.</p>

<h2>📋 What You'll Learn</h2>
<ul>
  <li>✅ Setting up a Vue.js project with Vite</li>
  <li>✅ Understanding Vue components and reactive state</li>
  <li>✅ Working with v-model and event handling</li>
  <li>✅ Creating computed properties and methods</li>
  <li>✅ Styling components with scoped CSS</li>
  <li>✅ Local storage for data persistence</li>
</ul>

<h2>🛠️ Prerequisites</h2>

<table>
  <thead>
    <tr>
      <th>Tool</th>
      <th>Version</th>
      <th>Installation</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Node.js</td>
      <td>18+</td>
      <td><a href="https://nodejs.org" target="_blank">Download</a></td>
    </tr>
    <tr>
      <td>npm/yarn</td>
      <td>Latest</td>
      <td>Included with Node.js</td>
    </tr>
    <tr>
      <td>Code Editor</td>
      <td>Any</td>
      <td>VS Code recommended</td>
    </tr>
  </tbody>
</table>

<h2>🎥 Video Walkthrough</h2>
<p>Prefer video? Watch the complete tutorial:</p>
<div class="video-container" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 20px 0;">
  <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allowfullscreen></iframe>
</div>

<h2>Step 1: Project Setup 🏗️</h2>

<p>First, let's create a new Vue.js project using Vite, a fast build tool that provides instant server start and lightning-fast HMR (Hot Module Replacement).</p>

<pre><code class="language-bash"># Create new project
npm create vite@latest my-vue-app -- --template vue

# Navigate to project directory
cd my-vue-app

# Install dependencies
npm install

# Start development server
npm run dev
</code></pre>

<div style="background: #d4edda; border-left: 4px solid #2ecc71; padding: 16px; margin: 20px 0; border-radius: 4px;">
<p><strong>✅ Success!</strong> Your development server should now be running at <code>http://localhost:5173</code></p>
</div>

<h2>Step 2: Project Structure 📁</h2>

<p>Let's understand the key files in your new project:</p>

<pre><code>my-vue-app/
├── public/              # Static assets
├── src/
│   ├── assets/          # Images, styles, etc.
│   ├── components/      # Vue components
│   ├── App.vue          # Root component
│   └── main.js          # App entry point
├── index.html           # HTML entry point
├── package.json         # Dependencies
└── vite.config.js       # Vite configuration
</code></pre>

<h2>Step 3: Creating the Todo Component 📝</h2>

<p>Create a new file <code>src/components/TodoList.vue</code> with the following content:</p>

<pre><code class="language-javascript">&lt;template&gt;
  &lt;div class="todo-app"&gt;
    &lt;h1&gt;My Todo List&lt;/h1&gt;
    
    &lt;!-- Input form --&gt;
    &lt;form @submit.prevent="addTodo"&gt;
      &lt;input
        v-model="newTodo"
        type="text"
        placeholder="What needs to be done?"
        class="todo-input"
      /&gt;
      &lt;button type="submit" class="add-button"&gt;Add&lt;/button&gt;
    &lt;/form&gt;
    
    &lt;!-- Todo list --&gt;
    &lt;ul class="todo-list"&gt;
      &lt;li
        v-for="todo in todos"
        :key="todo.id"
        :class="{ completed: todo.completed }"
        class="todo-item"
      &gt;
        &lt;input
          type="checkbox"
          v-model="todo.completed"
          @change="saveTodos"
        /&gt;
        &lt;span&gt;{{ todo.text }}&lt;/span&gt;
        &lt;button @click="deleteTodo(todo.id)" class="delete-button"&gt;
          ❌
        &lt;/button&gt;
      &lt;/li&gt;
    &lt;/ul&gt;
    
    &lt;!-- Stats --&gt;
    &lt;div class="stats"&gt;
      &lt;p&gt;Total: {{ totalTodos }} | Completed: {{ completedTodos }}&lt;/p&gt;
    &lt;/div&gt;
  &lt;/div&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { ref, computed, onMounted } from 'vue'

// Reactive state
const newTodo = ref('')
const todos = ref([])

// Load todos from localStorage on mount
onMounted(() => {
  const saved = localStorage.getItem('todos')
  if (saved) {
    todos.value = JSON.parse(saved)
  }
})

// Add new todo
const addTodo = () => {
  if (newTodo.value.trim()) {
    todos.value.push({
      id: Date.now(),
      text: newTodo.value,
      completed: false
    })
    newTodo.value = ''
    saveTodos()
  }
}

// Delete todo
const deleteTodo = (id) => {
  todos.value = todos.value.filter(todo => todo.id !== id)
  saveTodos()
}

// Save to localStorage
const saveTodos = () => {
  localStorage.setItem('todos', JSON.stringify(todos.value))
}

// Computed properties
const totalTodos = computed(() => todos.value.length)
const completedTodos = computed(() => 
  todos.value.filter(todo => todo.completed).length
)
&lt;/script&gt;

&lt;style scoped&gt;
.todo-app {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.todo-input {
  padding: 12px;
  font-size: 16px;
  border: 2px solid #ddd;
  border-radius: 4px;
  width: 70%;
}

.add-button {
  padding: 12px 24px;
  margin-left: 10px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.todo-list {
  list-style: none;
  padding: 0;
  margin-top: 20px;
}

.todo-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 10px;
}

.todo-item.completed span {
  text-decoration: line-through;
  opacity: 0.6;
}

.delete-button {
  margin-left: auto;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
}

.stats {
  margin-top: 20px;
  padding: 12px;
  background: #f8f9fb;
  border-radius: 4px;
  text-align: center;
}
&lt;/style&gt;
</code></pre>

<h2>Step 4: Import and Use the Component 🎯</h2>

<p>Update your <code>src/App.vue</code> file:</p>

<pre><code class="language-javascript">&lt;template&gt;
  &lt;div id="app"&gt;
    &lt;TodoList /&gt;
  &lt;/div&gt;
&lt;/template&gt;

&lt;script setup&gt;
import TodoList from './components/TodoList.vue'
&lt;/script&gt;

&lt;style&gt;
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  padding: 40px 20px;
}

#app {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  padding: 40px;
  max-width: 700px;
  margin: 0 auto;
}
&lt;/style&gt;
</code></pre>

<h2>🎉 Congratulations!</h2>

<p>You've just built your first Vue.js application! Your todo app now has:</p>

<ul>
  <li>✅ Add new todos</li>
  <li>✅ Mark todos as complete</li>
  <li>✅ Delete todos</li>
  <li>✅ Persistent storage (survives page refresh)</li>
  <li>✅ Real-time statistics</li>
</ul>

<h2>🚀 Next Steps</h2>

<p>Ready to level up? Try adding these features:</p>

<ol>
  <li><strong>Edit Todos</strong> - Allow users to edit existing todo text</li>
  <li><strong>Filter Todos</strong> - Add buttons to filter by all/active/completed</li>
  <li><strong>Due Dates</strong> - Add date picker for todo deadlines</li>
  <li><strong>Categories</strong> - Organize todos by category or project</li>
  <li><strong>Dark Mode</strong> - Add a theme toggle</li>
</ol>

<h2>📚 Additional Resources</h2>

<table>
  <thead>
    <tr>
      <th>Resource</th>
      <th>Link</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Vue.js Docs</td>
      <td><a href="https://vuejs.org" target="_blank">vuejs.org</a></td>
      <td>Official documentation</td>
    </tr>
    <tr>
      <td>Vue Mastery</td>
      <td><a href="https://www.vuemastery.com" target="_blank">vuemastery.com</a></td>
      <td>Video tutorials</td>
    </tr>
    <tr>
      <td>Vue School</td>
      <td><a href="https://vueschool.io" target="_blank">vueschool.io</a></td>
      <td>Interactive courses</td>
    </tr>
  </tbody>
</table>

<h2>🐛 Troubleshooting</h2>

<h3>Port Already in Use</h3>
<p>If port 5173 is already in use, Vite will automatically try the next available port. Check the console output for the actual URL.</p>

<h3>Module Not Found</h3>
<p>Make sure you ran <code>npm install</code> in your project directory.</p>

<h3>Changes Not Reflecting</h3>
<p>Try hard refreshing your browser (<kbd>Ctrl+Shift+R</kbd>) or restart the dev server.</p>

<blockquote>
<p><strong>💡 Pro Tip:</strong> Install the <a href="https://devtools.vuejs.org/" target="_blank">Vue DevTools</a> browser extension for better debugging and component inspection!</p>
</blockquote>

<hr>

<p style="text-align: center; margin-top: 30px;">
<strong>🎊 You're now a Vue.js developer! 🎊</strong><br><br>
<em>Keep building, keep learning, and don't forget to share your projects!</em><br>
#VueJS #WebDevelopment #Tutorial
</p>`
  }
]

/**
 * Get a media example by ID
 */
export function getMediaExampleById(id: string): ExampleTemplate | undefined {
  return mediaExamples.find(example => example.id === id)
}

/**
 * Get all media examples
 */
export function getAllMediaExamples(): ExampleTemplate[] {
  return mediaExamples
}
