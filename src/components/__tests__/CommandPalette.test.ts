import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CommandPalette from '../CommandPalette.vue'

describe('CommandPalette.vue', () => {
  const mockCommands = [
    {
      id: 'bold',
      name: 'Bold',
      description: 'Make text bold',
      icon: 'B',
      category: 'Formatting',
      shortcut: 'Ctrl+B',
      action: vi.fn(),
    },
    {
      id: 'italic',
      name: 'Italic',
      description: 'Make text italic',
      icon: 'I',
      category: 'Formatting',
      action: vi.fn(),
    },
    {
      id: 'heading1',
      name: 'Heading 1',
      description: 'Large heading',
      icon: 'H1',
      category: 'Structure',
      action: vi.fn(),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should not render when show is false', () => {
      const wrapper = mount(CommandPalette, {
        props: {
          show: false,
          commands: mockCommands,
        },
      })

      expect(wrapper.find('.command-palette-overlay').exists()).toBe(false)
    })

    it('should render when show is true', () => {
      const wrapper = mount(CommandPalette, {
        props: {
          show: true,
          commands: mockCommands,
        },
      })

      expect(wrapper.find('.command-palette-overlay').exists()).toBe(true)
      expect(wrapper.find('.command-palette').exists()).toBe(true)
    })

    it('should render search input', () => {
      const wrapper = mount(CommandPalette, {
        props: {
          show: true,
          commands: mockCommands,
        },
      })

      const input = wrapper.find('.command-palette-input')
      expect(input.exists()).toBe(true)
      expect(input.attributes('placeholder')).toBe('Type a command or search...')
    })

    it('should render commands when no search query', () => {
      const wrapper = mount(CommandPalette, {
        props: {
          show: true,
          commands: mockCommands,
        },
      })

      const commandItems = wrapper.findAll('.command-item')
      expect(commandItems.length).toBe(3)
    })
  })

  describe('Search Functionality', () => {
    it('should filter commands by name', async () => {
      const wrapper = mount(CommandPalette, {
        props: {
          show: true,
          commands: mockCommands,
        },
      })

      const input = wrapper.find('.command-palette-input')
      await input.setValue('bold')

      const commandItems = wrapper.findAll('.command-item')
      expect(commandItems.length).toBe(1)
      expect(commandItems[0].text()).toContain('Bold')
    })

    it('should filter commands by description', async () => {
      const wrapper = mount(CommandPalette, {
        props: {
          show: true,
          commands: mockCommands,
        },
      })

      const input = wrapper.find('.command-palette-input')
      await input.setValue('heading')

      const commandItems = wrapper.findAll('.command-item')
      expect(commandItems.length).toBe(1)
      expect(commandItems[0].text()).toContain('Heading 1')
    })

    it('should filter commands by category', async () => {
      const wrapper = mount(CommandPalette, {
        props: {
          show: true,
          commands: mockCommands,
        },
      })

      const input = wrapper.find('.command-palette-input')
      await input.setValue('formatting')

      const commandItems = wrapper.findAll('.command-item')
      expect(commandItems.length).toBe(2)
    })

    it('should show empty state when no matches', async () => {
      const wrapper = mount(CommandPalette, {
        props: {
          show: true,
          commands: mockCommands,
        },
      })

      const input = wrapper.find('.command-palette-input')
      await input.setValue('nonexistent')

      expect(wrapper.find('.command-palette-empty').exists()).toBe(true)
      expect(wrapper.text()).toContain('No commands found')
    })

    it('should be case-insensitive', async () => {
      const wrapper = mount(CommandPalette, {
        props: {
          show: true,
          commands: mockCommands,
        },
      })

      const input = wrapper.find('.command-palette-input')
      await input.setValue('BOLD')

      const commandItems = wrapper.findAll('.command-item')
      expect(commandItems.length).toBe(1)
    })
  })

  describe('Keyboard Navigation', () => {
    it('should select first command by default', () => {
      const wrapper = mount(CommandPalette, {
        props: {
          show: true,
          commands: mockCommands,
        },
      })

      const firstCommand = wrapper.findAll('.command-item')[0]
      expect(firstCommand.classes()).toContain('selected')
    })

    it('should navigate down with arrow key', async () => {
      const wrapper = mount(CommandPalette, {
        props: {
          show: true,
          commands: mockCommands,
        },
      })

      const input = wrapper.find('.command-palette-input')
      await input.trigger('keydown', { key: 'ArrowDown' })

      const commands = wrapper.findAll('.command-item')
      expect(commands[1].classes()).toContain('selected')
    })

    it('should navigate up with arrow key', async () => {
      const wrapper = mount(CommandPalette, {
        props: {
          show: true,
          commands: mockCommands,
        },
      })

      const input = wrapper.find('.command-palette-input')
      await input.trigger('keydown', { key: 'ArrowDown' })
      await input.trigger('keydown', { key: 'ArrowUp' })

      const commands = wrapper.findAll('.command-item')
      expect(commands[0].classes()).toContain('selected')
    })

    it('should not navigate beyond bounds', async () => {
      const wrapper = mount(CommandPalette, {
        props: {
          show: true,
          commands: mockCommands,
        },
      })

      const input = wrapper.find('.command-palette-input')
      
      // Try to go up from first item
      await input.trigger('keydown', { key: 'ArrowUp' })
      const firstCommand = wrapper.findAll('.command-item')[0]
      expect(firstCommand.classes()).toContain('selected')

      // Navigate to last and try to go beyond
      await input.trigger('keydown', { key: 'ArrowDown' })
      await input.trigger('keydown', { key: 'ArrowDown' })
      await input.trigger('keydown', { key: 'ArrowDown' })
      
      const commands = wrapper.findAll('.command-item')
      expect(commands[2].classes()).toContain('selected')
    })

    it('should execute command on Enter', async () => {
      const wrapper = mount(CommandPalette, {
        props: {
          show: true,
          commands: mockCommands,
        },
      })

      const input = wrapper.find('.command-palette-input')
      await input.trigger('keydown', { key: 'Enter' })

      expect(wrapper.emitted('execute')).toBeTruthy()
      expect(wrapper.emitted('execute')?.[0]).toEqual([mockCommands[0]])
    })

    it('should close on Escape', async () => {
      const wrapper = mount(CommandPalette, {
        props: {
          show: true,
          commands: mockCommands,
        },
      })

      const input = wrapper.find('.command-palette-input')
      await input.trigger('keydown', { key: 'Escape' })

      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Mouse Interaction', () => {
    it('should select command on hover', async () => {
      const wrapper = mount(CommandPalette, {
        props: {
          show: true,
          commands: mockCommands,
        },
      })

      const secondCommand = wrapper.findAll('.command-item')[1]
      await secondCommand.trigger('mouseenter')

      expect(secondCommand.classes()).toContain('selected')
    })

    it('should execute command on click', async () => {
      const wrapper = mount(CommandPalette, {
        props: {
          show: true,
          commands: mockCommands,
        },
      })

      const firstCommand = wrapper.findAll('.command-item')[0]
      await firstCommand.trigger('click')

      expect(wrapper.emitted('execute')).toBeTruthy()
      expect(wrapper.emitted('execute')?.[0]).toEqual([mockCommands[0]])
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should close when clicking overlay', async () => {
      const wrapper = mount(CommandPalette, {
        props: {
          show: true,
          commands: mockCommands,
        },
      })

      await wrapper.find('.command-palette-overlay').trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })

  describe('Categories', () => {
    it('should display unique categories', () => {
      const wrapper = mount(CommandPalette, {
        props: {
          show: true,
          commands: mockCommands,
        },
      })

      const categories = wrapper.findAll('.category-badge')
      expect(categories.length).toBe(2) // Formatting and Structure
      expect(categories.some(c => c.text() === 'Formatting')).toBe(true)
      expect(categories.some(c => c.text() === 'Structure')).toBe(true)
    })

    it('should update categories based on filtered results', async () => {
      const wrapper = mount(CommandPalette, {
        props: {
          show: true,
          commands: mockCommands,
        },
      })

      const input = wrapper.find('.command-palette-input')
      await input.setValue('heading')

      const categories = wrapper.findAll('.category-badge')
      expect(categories.length).toBe(1)
      expect(categories[0].text()).toBe('Structure')
    })
  })

  describe('Command Display', () => {
    it('should show command icon, name, and description', () => {
      const wrapper = mount(CommandPalette, {
        props: {
          show: true,
          commands: mockCommands,
        },
      })

      const firstCommand = wrapper.findAll('.command-item')[0]
      expect(firstCommand.find('.command-icon').text()).toBe('B')
      expect(firstCommand.find('.command-name').text()).toBe('Bold')
      expect(firstCommand.find('.command-description').text()).toBe('Make text bold')
    })

    it('should show shortcut when available', () => {
      const wrapper = mount(CommandPalette, {
        props: {
          show: true,
          commands: mockCommands,
        },
      })

      const firstCommand = wrapper.findAll('.command-item')[0]
      expect(firstCommand.find('.command-shortcut').exists()).toBe(true)
      expect(firstCommand.find('.command-shortcut').text()).toBe('Ctrl+B')
    })

    it('should not show shortcut when not available', () => {
      const wrapper = mount(CommandPalette, {
        props: {
          show: true,
          commands: mockCommands,
        },
      })

      const secondCommand = wrapper.findAll('.command-item')[1]
      expect(secondCommand.find('.command-shortcut').exists()).toBe(false)
    })
  })

  describe('Limit Results', () => {
    it('should limit results to 10', () => {
      const manyCommands = Array.from({ length: 20 }, (_, i) => ({
        id: `cmd${i}`,
        name: `Command ${i}`,
        description: `Description ${i}`,
        icon: '⚡',
        category: 'Test',
        action: vi.fn(),
      }))

      const wrapper = mount(CommandPalette, {
        props: {
          show: true,
          commands: manyCommands,
        },
      })

      const commandItems = wrapper.findAll('.command-item')
      expect(commandItems.length).toBe(10)
    })
  })

  describe('Dialog accessibility', () => {
    it('exposes the WAI-ARIA dialog contract on the palette box', () => {
      const wrapper = mount(CommandPalette, {
        props: { show: true, commands: mockCommands },
      })
      const box = wrapper.find('.command-palette')
      expect(box.attributes('role')).toBe('dialog')
      expect(box.attributes('aria-modal')).toBe('true')
      expect(box.attributes('aria-label')).toBeTruthy()
    })

    it('traps Tab inside the palette (wraps from the last control to the first)', async () => {
      const wrapper = mount(CommandPalette, {
        props: { show: true, commands: mockCommands },
        attachTo: document.body,
      })
      await wrapper.vm.$nextTick()

      const rootEl = wrapper.element as HTMLElement
      const focusables = Array.from(
        rootEl.querySelectorAll('input, button, a[href], [tabindex]')
      ) as HTMLElement[]
      const last = focusables[focusables.length - 1]
      last?.focus()

      // useModalDialog listens at document capture; dispatch a real Tab there.
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
      )
      await wrapper.vm.$nextTick()

      // Focus wrapped back into the palette (to the search input).
      expect(
        wrapper.element.contains(document.activeElement)
      ).toBe(true)
      wrapper.unmount()
    })

    it('restores focus to the previously-focused element on close', async () => {
      const trigger = document.createElement('button')
      document.body.appendChild(trigger)
      trigger.focus()

      const wrapper = mount(CommandPalette, {
        props: { show: false, commands: mockCommands },
        attachTo: document.body,
      })
      await wrapper.setProps({ show: true })
      await wrapper.vm.$nextTick()
      expect(document.activeElement).not.toBe(trigger)

      await wrapper.setProps({ show: false })
      await wrapper.vm.$nextTick()
      expect(document.activeElement).toBe(trigger)

      wrapper.unmount()
      trigger.remove()
    })
  })
})
