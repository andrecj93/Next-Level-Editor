import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ContextMenu from '../ContextMenu.vue'
import type { ContextMenuItem } from '../ContextMenu.vue'

describe('ContextMenu', () => {
  let wrapper: ReturnType<typeof mount>

  const defaultProps = {
    show: true,
    position: { top: 100, left: 200 },
    items: [] as ContextMenuItem[],
  }

  beforeEach(() => {
    // Create a div for teleport target
    const el = document.createElement('div')
    el.id = 'teleport-target'
    document.body.appendChild(el)
    
    // Mock document.addEventListener
    vi.spyOn(document, 'addEventListener')
    vi.spyOn(document, 'removeEventListener')
  })

  afterEach(() => {
    const el = document.getElementById('teleport-target')
    if (el) {
      document.body.removeChild(el)
    }
    if (wrapper) {
      wrapper.unmount()
    }
    vi.restoreAllMocks()
  })

  it('renders when show is true', () => {
    wrapper = mount(ContextMenu, {
      props: {
        ...defaultProps,
        items: [
          { id: 'test', label: 'Test Item', icon: '📝', onClick: vi.fn() },
        ],
      },
      attachTo: document.body,
    })

    // Check in the document body where teleport puts it
    const menu = document.body.querySelector('.context-menu')
    expect(menu).toBeTruthy()
  })

  it('does not render when show is false', () => {
    wrapper = mount(ContextMenu, {
      props: {
        ...defaultProps,
        show: false,
      },
      attachTo: document.body,
    })

    const menu = document.body.querySelector('.context-menu')
    expect(menu).toBeFalsy()
  })

  it('renders at the correct position', () => {
    wrapper = mount(ContextMenu, {
      props: defaultProps,
      attachTo: document.body,
    })

    const menu = document.body.querySelector('.context-menu') as HTMLElement
    expect(menu).toBeTruthy()
    expect(menu!.style.top).toBe('100px')
    expect(menu!.style.left).toBe('200px')
  })

  it('renders menu items correctly', () => {
    const items: ContextMenuItem[] = [
      { id: 'cut', label: 'Cut', icon: '✂️', shortcut: 'Ctrl+X', onClick: vi.fn() },
      { id: 'copy', label: 'Copy', icon: '📋', shortcut: 'Ctrl+C', onClick: vi.fn() },
    ]

    wrapper = mount(ContextMenu, {
      props: {
        ...defaultProps,
        items,
      },
      attachTo: document.body,
    })

    const menuItems = document.body.querySelectorAll('.context-menu-item')
    expect(menuItems).toHaveLength(2)
    expect(menuItems[0].textContent).toContain('Cut')
    expect(menuItems[0].textContent).toContain('Ctrl+X')
    expect(menuItems[1].textContent).toContain('Copy')
    expect(menuItems[1].textContent).toContain('Ctrl+C')
  })

  it('renders divider items', () => {
    const items: ContextMenuItem[] = [
      { id: 'cut', label: 'Cut', icon: '✂️', onClick: vi.fn() },
      { divider: true },
      { id: 'copy', label: 'Copy', icon: '📋', onClick: vi.fn() },
    ]

    wrapper = mount(ContextMenu, {
      props: {
        ...defaultProps,
        items,
      },
      attachTo: document.body,
    })

    const dividers = document.body.querySelectorAll('.context-menu-divider')
    expect(dividers).toHaveLength(1)
  })

  it('calls onClick when menu item is clicked', async () => {
    const onClickFn = vi.fn()
    const items: ContextMenuItem[] = [
      { id: 'test', label: 'Test', icon: '📝', onClick: onClickFn },
    ]

    wrapper = mount(ContextMenu, {
      props: {
        ...defaultProps,
        items,
      },
      attachTo: document.body,
    })

    const menuItem = document.body.querySelector('.context-menu-item') as HTMLElement
    menuItem.click()
    expect(onClickFn).toHaveBeenCalledOnce()
  })

  it('emits close event when menu item is clicked', async () => {
    const items: ContextMenuItem[] = [
      { id: 'test', label: 'Test', icon: '📝', onClick: vi.fn() },
    ]

    wrapper = mount(ContextMenu, {
      props: {
        ...defaultProps,
        items,
      },
      attachTo: document.body,
    })

    const menuItem = document.body.querySelector('.context-menu-item') as HTMLElement
    menuItem.click()
    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('disables menu items when disabled prop is true', () => {
    const items: ContextMenuItem[] = [
      { id: 'test', label: 'Test', icon: '📝', onClick: vi.fn(), disabled: true },
    ]

    wrapper = mount(ContextMenu, {
      props: {
        ...defaultProps,
        items,
      },
      attachTo: document.body,
    })

    const menuItem = document.body.querySelector('.context-menu-item') as HTMLElement
    expect(menuItem.hasAttribute('disabled')).toBe(true)
  })

  it('does not call onClick for disabled items', async () => {
    const onClickFn = vi.fn()
    const items: ContextMenuItem[] = [
      { id: 'test', label: 'Test', icon: '📝', onClick: onClickFn, disabled: true },
    ]

    wrapper = mount(ContextMenu, {
      props: {
        ...defaultProps,
        items,
      },
      attachTo: document.body,
    })

    const menuItem = document.body.querySelector('.context-menu-item') as HTMLElement
    menuItem.click()
    expect(onClickFn).not.toHaveBeenCalled()
  })
})
