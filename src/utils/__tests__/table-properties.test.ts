import { describe, it, expect, beforeEach } from 'vitest'
import {
  applyCellProperties,
  applyTableProperties,
  getCellProperties,
  getTableProperties
} from '../commands'

describe('Table Properties Functions', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  describe('applyCellProperties', () => {
    it('should apply background color to cell', () => {
      const cell = document.createElement('td')
      applyCellProperties(cell, { backgroundColor: '#ff0000' })
      // JSDOM may return hex or rgb format
      expect(cell.style.backgroundColor).toMatch(/#ff0000|rgb\(255, 0, 0\)/)
    })

    it('should clear background color when empty string provided', () => {
      const cell = document.createElement('td')
      cell.style.backgroundColor = '#ff0000'
      applyCellProperties(cell, { backgroundColor: '' })
      expect(cell.style.backgroundColor).toBe('')
    })

    it('should apply text alignment to cell', () => {
      const cell = document.createElement('td')
      applyCellProperties(cell, { textAlign: 'center' })
      expect(cell.style.textAlign).toBe('center')
    })

    it('should apply vertical alignment to cell', () => {
      const cell = document.createElement('td')
      applyCellProperties(cell, { verticalAlign: 'top' })
      expect(cell.style.verticalAlign).toBe('top')
    })

    it('should apply padding to cell', () => {
      const cell = document.createElement('td')
      applyCellProperties(cell, { padding: 16 })
      expect(cell.style.padding).toBe('16px')
    })

    it('should apply width to cell', () => {
      const cell = document.createElement('td')
      applyCellProperties(cell, { width: '200px' })
      expect(cell.style.width).toBe('200px')
    })

    it('should apply height to cell', () => {
      const cell = document.createElement('td')
      applyCellProperties(cell, { height: '50px' })
      expect(cell.style.height).toBe('50px')
    })

    it('should apply multiple properties at once', () => {
      const cell = document.createElement('td')
      applyCellProperties(cell, {
        backgroundColor: '#00ff00',
        textAlign: 'right',
        verticalAlign: 'bottom',
        padding: 10
      })
      expect(cell.style.backgroundColor).toMatch(/#00ff00|rgb\(0, 255, 0\)/)
      expect(cell.style.textAlign).toBe('right')
      expect(cell.style.verticalAlign).toBe('bottom')
      expect(cell.style.padding).toBe('10px')
    })
  })

  describe('applyTableProperties', () => {
    it('should apply border style to all cells', () => {
      const table = document.createElement('table')
      const tbody = document.createElement('tbody')
      const tr = document.createElement('tr')
      const td1 = document.createElement('td')
      const td2 = document.createElement('td')
      
      tr.appendChild(td1)
      tr.appendChild(td2)
      tbody.appendChild(tr)
      table.appendChild(tbody)
      
      applyTableProperties(table, {
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: '#000000'
      })
      
      expect(td1.style.border).toMatch(/2px dashed (#000000|rgb\(0, 0, 0\))/)
      expect(td2.style.border).toMatch(/2px dashed (#000000|rgb\(0, 0, 0\))/)
    })

    it('should remove borders when style is none', () => {
      const table = document.createElement('table')
      const tbody = document.createElement('tbody')
      const tr = document.createElement('tr')
      const td = document.createElement('td')
      
      tr.appendChild(td)
      tbody.appendChild(tr)
      table.appendChild(tbody)
      
      applyTableProperties(table, {
        borderStyle: 'none'
      })
      
      expect(td.style.border).toContain('none')
    })

    it('should apply width to table', () => {
      const table = document.createElement('table')
      applyTableProperties(table, { width: '500px' })
      expect(table.style.width).toBe('500px')
    })

    it('should apply background color to table', () => {
      const table = document.createElement('table')
      applyTableProperties(table, { backgroundColor: '#f0f0f0' })
      expect(table.style.backgroundColor).toMatch(/#f0f0f0|rgb\(240, 240, 240\)/)
    })

    it('should clear background color when empty string provided', () => {
      const table = document.createElement('table')
      table.style.backgroundColor = '#f0f0f0'
      applyTableProperties(table, { backgroundColor: '' })
      expect(table.style.backgroundColor).toBe('')
    })

    it('should set border collapse', () => {
      const table = document.createElement('table')
      applyTableProperties(table, { borderCollapse: true })
      expect(table.style.borderCollapse).toBe('collapse')
    })

    it('should set border separate', () => {
      const table = document.createElement('table')
      applyTableProperties(table, { borderCollapse: false })
      expect(table.style.borderCollapse).toBe('separate')
    })

    it('should apply borders to both td and th cells', () => {
      const table = document.createElement('table')
      const thead = document.createElement('thead')
      const headerRow = document.createElement('tr')
      const th = document.createElement('th')
      headerRow.appendChild(th)
      thead.appendChild(headerRow)
      table.appendChild(thead)
      
      const tbody = document.createElement('tbody')
      const tr = document.createElement('tr')
      const td = document.createElement('td')
      tr.appendChild(td)
      tbody.appendChild(tr)
      table.appendChild(tbody)
      
      applyTableProperties(table, {
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#333333'
      })
      
      expect(th.style.border).toMatch(/1px solid (#333333|rgb\(51, 51, 51\))/)
      expect(td.style.border).toMatch(/1px solid (#333333|rgb\(51, 51, 51\))/)
    })
  })

  describe('getCellProperties', () => {
    it('should get default cell properties', () => {
      const cell = document.createElement('td')
      document.body.appendChild(cell)
      
      const props = getCellProperties(cell)
      
      expect(props.backgroundColor).toBe('')
      expect(props.textAlign).toBeDefined()
      expect(props.verticalAlign).toBeDefined()
      expect(props.padding).toBeGreaterThanOrEqual(0)
      expect(props.width).toBe('')
      expect(props.height).toBe('')
    })

    it('should get styled cell properties', () => {
      const cell = document.createElement('td')
      cell.style.backgroundColor = '#ff0000'
      cell.style.textAlign = 'center'
      cell.style.verticalAlign = 'top'
      cell.style.padding = '20px'
      cell.style.width = '300px'
      cell.style.height = '100px'
      document.body.appendChild(cell)
      
      const props = getCellProperties(cell)
      
      expect(props.backgroundColor).toMatch(/#ff0000|rgb\(255, 0, 0\)/)
      expect(props.textAlign).toBe('center')
      expect(props.verticalAlign).toBe('top')
      expect(props.padding).toBe(20)
      expect(props.width).toBe('300px')
      expect(props.height).toBe('100px')
    })
  })

  describe('getTableProperties', () => {
    it('should get default table properties', () => {
      const table = document.createElement('table')
      const tbody = document.createElement('tbody')
      const tr = document.createElement('tr')
      const td = document.createElement('td')
      
      tr.appendChild(td)
      tbody.appendChild(tr)
      table.appendChild(tbody)
      document.body.appendChild(table)
      
      const props = getTableProperties(table)
      
      expect(props.borderStyle).toBeDefined()
      expect(props.borderWidth).toBeGreaterThanOrEqual(0)
      expect(props.borderColor).toBeDefined()
      expect(props.width).toBeDefined()
      expect(props.backgroundColor).toBe('')
      expect(typeof props.borderCollapse).toBe('boolean')
    })

    it('should get styled table properties', () => {
      const table = document.createElement('table')
      table.style.width = '800px'
      table.style.backgroundColor = '#f5f5f5'
      table.style.borderCollapse = 'collapse'
      
      const tbody = document.createElement('tbody')
      const tr = document.createElement('tr')
      const td = document.createElement('td')
      td.style.border = '2px solid #000000'
      
      tr.appendChild(td)
      tbody.appendChild(tr)
      table.appendChild(tbody)
      document.body.appendChild(table)
      
      const props = getTableProperties(table)
      
      expect(props.width).toBe('800px')
      expect(props.backgroundColor).toMatch(/#f5f5f5|rgb\(245, 245, 245\)/)
      expect(props.borderCollapse).toBe(true)
      expect(props.borderWidth).toBe(2)
    })
  })
})
