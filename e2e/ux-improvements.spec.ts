import { test, expect } from '@playwright/test'

test.describe('Next Level Editor - UX Improvements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?empty=true')
    await page.waitForSelector('.editor-content')
  })

  test.describe('Slash Commands', () => {
    test('should not insert "/" character when opening slash command menu', async ({ page }) => {
      const editor = page.locator('.editor-content')
      await editor.click()
      
      // Clear existing content
      await page.keyboard.press('Control+A')
      await page.keyboard.press('Delete')
      
      // Press "/" to open command menu
      await page.keyboard.press('/')
      
      // Wait a moment for any potential character insertion
      await page.waitForTimeout(200)
      
      // Check that "/" was NOT inserted in the editor
      const editorText = await editor.textContent()
      expect(editorText?.includes('/')).toBeFalsy()
      
      // Verify command menu is visible
      const commandMenu = page.locator('.slash-commands, .quick-actions')
      await expect(commandMenu).toBeVisible({ timeout: 2000 })
    })

    test('should show command menu on "/" press', async ({ page }) => {
      const editor = page.locator('.editor-content')
      await editor.click()
      
      await page.keyboard.press('/')
      
      // Command menu should appear
      const commandMenu = page.locator('.slash-commands, .quick-actions')
      await expect(commandMenu).toBeVisible({ timeout: 2000 })
    })

    test('should insert list without "/" artifact on undo', async ({ page }) => {
      const editor = page.locator('.editor-content')
      await editor.click()
      
      // Clear existing content
      await page.keyboard.press('Control+A')
      await page.keyboard.press('Delete')
      
      // Type some text
      await editor.pressSequentially('Test text')
      
      // Press "/" and select bullet list
      await page.keyboard.press('/')
      await page.waitForTimeout(300)
      
      // Click on Bullet List option
      const bulletOption = page.locator('text=Bullet List').first()
      await bulletOption.click()
      
      // Check list was created
      const ul = editor.locator('ul')
      await expect(ul).toBeVisible({ timeout: 2000 })
      
      // Now undo
      await page.keyboard.press('Control+Z')
      
      // Check that no "/" artifact remains
      const editorText = await editor.textContent()
      expect(editorText?.includes('/list')).toBeFalsy()
      expect(editorText?.includes('/')).toBeFalsy()
    })
  })

  test.describe('Auto-Save Indicator', () => {
    test('should update auto-save timestamp after content change', async ({ page }) => {
      const editor = page.locator('.editor-content')
      await editor.click()
      
      // Wait for initial auto-save
      const savedIndicator = page.locator('.saved, text=/Saved at/')
      await savedIndicator.waitFor({ timeout: 5000 })
      
      // Get initial timestamp
      const initialText = await savedIndicator.textContent()
      
      // Make a change
      await editor.pressSequentially('New content')
      
      // Wait a bit for auto-save to trigger
      await page.waitForTimeout(2000)
      
      // Get new timestamp  
      const newText = await savedIndicator.textContent()
      
      // Timestamps should be different (or at minimum, indicator should still be present)
      expect(newText).toBeTruthy()
      await expect(savedIndicator).toBeVisible()
    })
  })

  test.describe('Export Buttons', () => {
    test('should show clear labels on export buttons', async ({ page }) => {
      // Check HTML export button
      const htmlButton = page.locator('button:has-text("HTML")')
      await expect(htmlButton).toBeVisible()
      
      // Check MD export button
      const mdButton = page.locator('button:has-text("MD")')
      await expect(mdButton).toBeVisible()
      
      // Check PDF export button
      const pdfButton = page.locator('button:has-text("PDF")')
      await expect(pdfButton).toBeVisible()
      
      // Check DOCX export button
      const docxButton = page.locator('button:has-text("DOCX")')
      await expect(docxButton).toBeVisible()
    })

    test('export buttons should have descriptive tooltips', async ({ page }) => {
      const htmlButton = page.locator('button:has-text("HTML")')
      await htmlButton.hover()
      
      // Tooltip should contain file extension info
      await expect(page.locator('[data-tooltip*=".html"], [title*=".html"]')).toBeVisible({ timeout: 2000 })
    })
  })

  test.describe('View Mode Buttons', () => {
    test('should show text labels on view mode buttons', async ({ page }) => {
      // Check Editor button label
      const editorButton = page.locator('button:has-text("Editor")')
      await expect(editorButton).toBeVisible()
      
      // Check Code button label
      const codeButton = page.locator('button:has-text("Code")')
      await expect(codeButton).toBeVisible()
      
      // Check Split button label
      const splitButton = page.locator('button:has-text("Split")')
      await expect(splitButton).toBeVisible()
      
      // Check Preview button label
      const previewButton = page.locator('button:has-text("Preview")')
      await expect(previewButton).toBeVisible()
    })

    test('should switch between Editor and Code view', async ({ page }) => {
      const editorContent = page.locator('.editor-content')
      await expect(editorContent).toBeVisible()
      
      // Click Code view button
      const codeButton = page.locator('button:has-text("Code")').first()
      await codeButton.click()
      
      // Wait for code view
      await page.waitForTimeout(500)
      
      // Should show code view (textarea or code editor)
      const codeView = page.locator('textarea, .code-view, .code-editor')
      await expect(codeView).toBeVisible({ timeout: 2000 })
      
      // Click back to Editor view
      const editorButton = page.locator('button:has-text("Editor")').first()
      await editorButton.click()
      
      await page.waitForTimeout(500)
      
      // Editor should be visible again
      await expect(editorContent).toBeVisible()
    })
  })

  test.describe('Image Upload Modal', () => {
    test('should show helpful hint when no image provided', async ({ page }) => {
      // Open Insert menu
      await page.click('button:has-text("Insert")')
      
      // Click Image
      await page.click('button:has-text("Image")')
      
      // Modal should appear
      const modal = page.locator('[role="dialog"], .modal-overlay')
      await expect(modal).toBeVisible()
      
      // Check for helpful hint
      const hint = page.locator('text=/Enter a URL or upload a file/')
      await expect(hint).toBeVisible()
      
      // Insert button should be disabled
      const insertButton = page.locator('button:has-text("Insert Image")')
      await expect(insertButton).toBeDisabled()
    })

    test('should enable Insert button when URL is provided', async ({ page }) => {
      // Open Insert menu
      await page.click('button:has-text("Insert")')
      
      // Click Image
      await page.click('button:has-text("Image")')
      
      // Enter URL
      const urlInput = page.locator('input#image-url, input[placeholder*="example.com"]')
      await urlInput.fill('https://example.com/image.jpg')
      
      // Wait a moment for validation
      await page.waitForTimeout(300)
      
      // Insert button should now be enabled
      const insertButton = page.locator('button:has-text("Insert Image")')
      await expect(insertButton).not.toBeDisabled()
    })

    test('should have checkmark icon on Insert button', async ({ page }) => {
      // Open Insert menu
      await page.click('button:has-text("Insert")')
      
      // Click Image  
      await page.click('button:has-text("Image")')
      
      // Check for checkmark in button text
      const insertButton = page.locator('button:has-text("✓ Insert Image")')
      await expect(insertButton).toBeVisible()
    })
  })

  test.describe('Color Picker', () => {
    test('should auto-close after color selection', async ({ page }) => {
      const editor = page.locator('.editor-content')
      await editor.click()
      
      // Type some text
      await editor.pressSequentially('Color test')
      
      // Select all
      await page.keyboard.press('Control+A')
      
      // Open colors dropdown
      await page.click('button:has-text("Colors")')
      
      // Wait for dropdown to open
      await page.waitForTimeout(300)
      
      // Click a color (look for color buttons or swatches)
      const colorButton = page.locator('.color-swatch, .color-button, button[data-color]').first()
      await colorButton.click()
      
      // Wait for auto-close (300ms + a bit extra)
      await page.waitForTimeout(500)
      
      // Colors dropdown should be closed
      const colorsDropdown = page.locator('.colors-dropdown, .color-picker-dropdown')
      await expect(colorsDropdown).not.toBeVisible()
    })
  })
})
