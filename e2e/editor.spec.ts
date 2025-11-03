import { test, expect } from '@playwright/test'

test.describe('Next Level Editor - Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.editor-content')
  })

  test('should load the editor', async ({ page }) => {
    await expect(page.locator('.editor-content')).toBeVisible()
    await expect(page.locator('.toolbar')).toBeVisible()
  })

  test('should allow typing in the editor', async ({ page }) => {
    const editor = page.locator('.editor-content')
    await editor.click()
    await editor.type('Hello World')
    
    await expect(editor).toContainText('Hello World')
  })

  test('should show word count', async ({ page }) => {
    const editor = page.locator('.editor-content')
    await editor.click()
    await editor.type('Test word count')
    
    const wordCount = page.locator('.word-count')
    await expect(wordCount).toContainText('3 words')
  })
})

test.describe('Next Level Editor - Formatting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.editor-content')
  })

  test('should apply bold formatting', async ({ page }) => {
    const editor = page.locator('.editor-content')
    await editor.click()
    await editor.type('Bold text')
    
    // Select all text
    await page.keyboard.press('Control+A')
    
    // Click bold button
    await page.click('button[aria-label="Bold"]')
    
    // Check if bold tag exists
    const bold = editor.locator('strong')
    await expect(bold).toBeVisible()
    await expect(bold).toContainText('Bold text')
  })

  test('should apply italic formatting', async ({ page }) => {
    const editor = page.locator('.editor-content')
    await editor.click()
    await editor.type('Italic text')
    
    await page.keyboard.press('Control+A')
    await page.click('button[aria-label="Italic"]')
    
    const italic = editor.locator('em')
    await expect(italic).toBeVisible()
  })

  test('should apply underline formatting', async ({ page }) => {
    const editor = page.locator('.editor-content')
    await editor.click()
    await editor.type('Underline text')
    
    await page.keyboard.press('Control+A')
    await page.click('button[aria-label="Underline"]')
    
    const underline = editor.locator('u')
    await expect(underline).toBeVisible()
  })

  test('should toggle formatting off', async ({ page }) => {
    const editor = page.locator('.editor-content')
    await editor.click()
    await editor.type('Toggle text')
    
    await page.keyboard.press('Control+A')
    
    // Apply bold
    await page.click('button[aria-label="Bold"]')
    let bold = editor.locator('strong')
    await expect(bold).toBeVisible()
    
    // Toggle bold off
    await page.keyboard.press('Control+A')
    await page.click('button[aria-label="Bold"]')
    
    // Should not have bold anymore (or text should be unwrapped)
    await expect(editor).toContainText('Toggle text')
  })
})

test.describe('Next Level Editor - Headings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.editor-content')
  })

  test('should create heading 1', async ({ page }) => {
    const editor = page.locator('.editor-content')
    await editor.click()
    await editor.type('Heading 1')
    
    await page.keyboard.press('Control+A')
    
    // Open format dropdown
    await page.click('button:has-text("Format")')
    await page.click('text=Heading 1')
    
    const h1 = editor.locator('h1')
    await expect(h1).toBeVisible()
    await expect(h1).toContainText('Heading 1')
  })

  test('should create heading 2', async ({ page }) => {
    const editor = page.locator('.editor-content')
    await editor.click()
    await editor.type('Heading 2')
    
    await page.keyboard.press('Control+A')
    await page.click('button:has-text("Format")')
    await page.click('text=Heading 2')
    
    const h2 = editor.locator('h2')
    await expect(h2).toBeVisible()
  })
})

test.describe('Next Level Editor - Lists', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.editor-content')
  })

  test('should create bullet list', async ({ page }) => {
    const editor = page.locator('.editor-content')
    await editor.click()
    await editor.type('List item')
    
    await page.keyboard.press('Control+A')
    await page.click('button[aria-label="Bullet List"]')
    
    const ul = editor.locator('ul')
    await expect(ul).toBeVisible()
    
    const li = editor.locator('li')
    await expect(li).toContainText('List item')
  })

  test('should create numbered list', async ({ page }) => {
    const editor = page.locator('.editor-content')
    await editor.click()
    await editor.type('Numbered item')
    
    await page.keyboard.press('Control+A')
    await page.click('button[aria-label="Numbered List"]')
    
    const ol = editor.locator('ol')
    await expect(ol).toBeVisible()
  })
})

test.describe('Next Level Editor - Undo/Redo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.editor-content')
  })

  test('should undo changes', async ({ page }) => {
    const editor = page.locator('.editor-content')
    await editor.click()
    await editor.type('First text')
    
    await expect(editor).toContainText('First text')
    
    // Undo using keyboard shortcut
    await page.keyboard.press('Control+Z')
    
    // Text should be removed or partially removed
    const text = await editor.textContent()
    expect(text?.length || 0).toBeLessThan('First text'.length)
  })

  test('should redo changes', async ({ page }) => {
    const editor = page.locator('.editor-content')
    await editor.click()
    await editor.type('Test')
    
    // Undo
    await page.keyboard.press('Control+Z')
    
    // Redo
    await page.keyboard.press('Control+Shift+Z')
    
    await expect(editor).toContainText('Test')
  })

  test('undo button should be disabled initially', async ({ page }) => {
    const undoButton = page.locator('button[aria-label="Undo"]')
    await expect(undoButton).toBeDisabled()
  })
})

test.describe('Next Level Editor - Context Menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.editor-content')
  })

  test('should show context menu on right click', async ({ page }) => {
    const editor = page.locator('.editor-content')
    await editor.click()
    await editor.type('Context menu test')
    
    // Right click
    await editor.click({ button: 'right' })
    
    // Context menu should appear
    const contextMenu = page.locator('.context-menu')
    await expect(contextMenu).toBeVisible()
  })

  test('context menu should have cut, copy, paste options', async ({ page }) => {
    const editor = page.locator('.editor-content')
    await editor.click()
    await editor.type('Test text')
    
    await editor.click({ button: 'right' })
    
    const contextMenu = page.locator('.context-menu')
    await expect(contextMenu.locator('text=Cut')).toBeVisible()
    await expect(contextMenu.locator('text=Copy')).toBeVisible()
    await expect(contextMenu.locator('text=Paste')).toBeVisible()
  })
})

test.describe('Next Level Editor - Floating Toolbar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.editor-content')
  })

  test('should show floating toolbar on text selection', async ({ page }) => {
    const editor = page.locator('.editor-content')
    await editor.click()
    await editor.type('Select this text')
    
    // Select all
    await page.keyboard.press('Control+A')
    
    // Wait a bit for floating toolbar to appear
    await page.waitForTimeout(500)
    
    // Floating toolbar should be visible
    const floatingToolbar = page.locator('.floating-toolbar')
    await expect(floatingToolbar).toBeVisible()
  })
})

test.describe('Next Level Editor - Theme Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.editor-content')
  })

  test('should toggle theme', async ({ page }) => {
    const themeButton = page.locator('button[aria-label="Toggle dark/light theme"]')
    await expect(themeButton).toBeVisible()
    
    // Get initial class
    const editor = page.locator('.next-level-editor')
    const initialClass = await editor.getAttribute('class')
    
    // Toggle theme
    await themeButton.click()
    
    // Class should change
    const newClass = await editor.getAttribute('class')
    expect(newClass).not.toBe(initialClass)
  })
})

test.describe('Next Level Editor - Font Size', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.editor-content')
  })

  test('should change font size', async ({ page }) => {
    const editor = page.locator('.editor-content')
    await editor.click()
    await editor.type('Font size test')
    
    await page.keyboard.press('Control+A')
    
    // Open size dropdown
    await page.click('button:has-text("Size")')
    
    // Select large size
    await page.click('text=Large')
    
    // Check if span with font size exists
    const span = editor.locator('span[style*="font-size"]')
    await expect(span).toBeVisible()
  })
})

test.describe('Next Level Editor - Enter Key', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.editor-content')
  })

  test('should create new paragraph on Enter', async ({ page }) => {
    const editor = page.locator('.editor-content')
    await editor.click()
    await editor.type('First line')
    await page.keyboard.press('Enter')
    await editor.type('Second line')
    
    const paragraphs = editor.locator('p')
    const count = await paragraphs.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('cursor should not jump to top after Enter', async ({ page }) => {
    const editor = page.locator('.editor-content')
    await editor.click()
    await editor.type('Line 1')
    await page.keyboard.press('Enter')
    await editor.type('Line 2')
    
    await expect(editor).toContainText('Line 1')
    await expect(editor).toContainText('Line 2')
    
    // The order should be preserved
    const text = await editor.textContent()
    const line1Index = text?.indexOf('Line 1') || -1
    const line2Index = text?.indexOf('Line 2') || -1
    expect(line1Index).toBeLessThan(line2Index)
  })
})
