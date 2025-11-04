import { describe, it, expect, beforeEach } from 'vitest'
import {
  getSelectedTable,
  getSelectedCell,
  addTableRow,
  removeTableRow,
  addTableColumn,
  removeTableColumn,
  deleteTable
} from '../commands'

describe('Table Designer Functions', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  describe('getSelectedTable', () => {
    it('should return null when no table is in selection', () => {
      const div = document.createElement('div')
      div.textContent = 'Not a table'
      document.body.appendChild(div)
      
      const range = document.createRange()
      range.selectNodeContents(div)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)

      expect(getSelectedTable()).toBeNull()
    })

    it('should return table when selection is inside a table', () => {
      const table = document.createElement('table')
      const tbody = document.createElement('tbody')
      const tr = document.createElement('tr')
      const td = document.createElement('td')
      td.textContent = 'Cell'
      
      tr.appendChild(td)
      tbody.appendChild(tr)
      table.appendChild(tbody)
      document.body.appendChild(table)
      
      const range = document.createRange()
      range.selectNodeContents(td)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)

      expect(getSelectedTable()).toBe(table)
    })
  })

  describe('getSelectedCell', () => {
    it('should return null when no cell is in selection', () => {
      const div = document.createElement('div')
      div.textContent = 'Not a cell'
      document.body.appendChild(div)
      
      const range = document.createRange()
      range.selectNodeContents(div)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)

      expect(getSelectedCell()).toBeNull()
    })

    it('should return cell when selection is inside a td', () => {
      const table = document.createElement('table')
      const tbody = document.createElement('tbody')
      const tr = document.createElement('tr')
      const td = document.createElement('td')
      td.textContent = 'Cell'
      
      tr.appendChild(td)
      tbody.appendChild(tr)
      table.appendChild(tbody)
      document.body.appendChild(table)
      
      const range = document.createRange()
      range.selectNodeContents(td)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)

      expect(getSelectedCell()).toBe(td)
    })

    it('should return cell when selection is inside a th', () => {
      const table = document.createElement('table')
      const thead = document.createElement('thead')
      const tr = document.createElement('tr')
      const th = document.createElement('th')
      th.textContent = 'Header'
      
      tr.appendChild(th)
      thead.appendChild(tr)
      table.appendChild(thead)
      document.body.appendChild(table)
      
      const range = document.createRange()
      range.selectNodeContents(th)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)

      expect(getSelectedCell()).toBe(th)
    })
  })

  describe('addTableRow', () => {
    it('should add a row at the end when no index is specified', () => {
      const table = document.createElement('table')
      const tbody = document.createElement('tbody')
      const tr = document.createElement('tr')
      const td = document.createElement('td')
      
      tr.appendChild(td)
      tbody.appendChild(tr)
      table.appendChild(tbody)
      
      const rowsBefore = tbody.getElementsByTagName('tr').length
      expect(rowsBefore).toBe(1)
      
      addTableRow(table)
      
      const rowsAfter = tbody.getElementsByTagName('tr').length
      expect(rowsAfter).toBe(2)
      expect(tbody.getElementsByTagName('tr')[1].cells.length).toBe(1)
    })

    it('should add a row at the specified index', () => {
      const table = document.createElement('table')
      const tbody = document.createElement('tbody')
      const tr1 = document.createElement('tr')
      const td1 = document.createElement('td')
      tr1.appendChild(td1)
      tbody.appendChild(tr1)
      
      const tr2 = document.createElement('tr')
      const td2 = document.createElement('td')
      tr2.appendChild(td2)
      tbody.appendChild(tr2)
      
      table.appendChild(tbody)
      
      const rowsBefore = tbody.getElementsByTagName('tr').length
      expect(rowsBefore).toBe(2)
      
      addTableRow(table, 1)
      
      const rowsAfter = tbody.getElementsByTagName('tr').length
      expect(rowsAfter).toBe(3)
      expect(tbody.getElementsByTagName('tr')[1].cells.length).toBe(1)
    })

    it('should match column count of existing rows', () => {
      const table = document.createElement('table')
      const tbody = document.createElement('tbody')
      const tr = document.createElement('tr')
      
      for (let i = 0; i < 3; i++) {
        const td = document.createElement('td')
        tr.appendChild(td)
      }
      
      tbody.appendChild(tr)
      table.appendChild(tbody)
      
      addTableRow(table)
      
      const rows = tbody.getElementsByTagName('tr')
      expect(rows[1].cells.length).toBe(3)
    })
  })

  describe('removeTableRow', () => {
    it('should remove the specified row', () => {
      const table = document.createElement('table')
      const tbody = document.createElement('tbody')
      
      for (let i = 0; i < 3; i++) {
        const tr = document.createElement('tr')
        const td = document.createElement('td')
        td.textContent = `Row ${i}`
        tr.appendChild(td)
        tbody.appendChild(tr)
      }
      
      table.appendChild(tbody)
      
      const rowsBefore = tbody.getElementsByTagName('tr').length
      expect(rowsBefore).toBe(3)
      
      removeTableRow(table, 1)
      
      const rowsAfter = tbody.getElementsByTagName('tr')
      expect(rowsAfter.length).toBe(2)
      expect(rowsAfter[0].cells[0].textContent).toBe('Row 0')
      expect(rowsAfter[1].cells[0].textContent).toBe('Row 2')
    })

    it('should not remove the last row', () => {
      const table = document.createElement('table')
      const tbody = document.createElement('tbody')
      const tr = document.createElement('tr')
      const td = document.createElement('td')
      
      tr.appendChild(td)
      tbody.appendChild(tr)
      table.appendChild(tbody)
      
      const rowsBefore = tbody.getElementsByTagName('tr').length
      expect(rowsBefore).toBe(1)
      
      removeTableRow(table, 0)
      
      const rowsAfter = tbody.getElementsByTagName('tr').length
      expect(rowsAfter).toBe(1)
    })
  })

  describe('addTableColumn', () => {
    it('should add a column at the end when no index is specified', () => {
      const table = document.createElement('table')
      const tbody = document.createElement('tbody')
      const tr = document.createElement('tr')
      const td = document.createElement('td')
      
      tr.appendChild(td)
      tbody.appendChild(tr)
      table.appendChild(tbody)
      
      expect(tr.cells.length).toBe(1)
      
      addTableColumn(table)
      
      expect(tr.cells.length).toBe(2)
    })

    it('should add a column at the specified index', () => {
      const table = document.createElement('table')
      const tbody = document.createElement('tbody')
      const tr = document.createElement('tr')
      
      for (let i = 0; i < 3; i++) {
        const td = document.createElement('td')
        td.textContent = `Col ${i}`
        tr.appendChild(td)
      }
      
      tbody.appendChild(tr)
      table.appendChild(tbody)
      
      expect(tr.cells.length).toBe(3)
      
      addTableColumn(table, 1)
      
      expect(tr.cells.length).toBe(4)
      expect(tr.cells[0].textContent).toBe('Col 0')
      expect(tr.cells[2].textContent).toBe('Col 1')
    })

    it('should add column to header if exists', () => {
      const table = document.createElement('table')
      const thead = document.createElement('thead')
      const headerRow = document.createElement('tr')
      const th = document.createElement('th')
      th.textContent = 'Header 1'
      
      headerRow.appendChild(th)
      thead.appendChild(headerRow)
      table.appendChild(thead)
      
      const tbody = document.createElement('tbody')
      const tr = document.createElement('tr')
      const td = document.createElement('td')
      
      tr.appendChild(td)
      tbody.appendChild(tr)
      table.appendChild(tbody)
      
      expect(headerRow.cells.length).toBe(1)
      expect(tr.cells.length).toBe(1)
      
      addTableColumn(table)
      
      expect(headerRow.cells.length).toBe(2)
      expect(tr.cells.length).toBe(2)
    })

    it('should add column to all rows', () => {
      const table = document.createElement('table')
      const tbody = document.createElement('tbody')
      
      for (let i = 0; i < 3; i++) {
        const tr = document.createElement('tr')
        const td = document.createElement('td')
        tr.appendChild(td)
        tbody.appendChild(tr)
      }
      
      table.appendChild(tbody)
      
      addTableColumn(table)
      
      const rows = tbody.getElementsByTagName('tr')
      for (let i = 0; i < 3; i++) {
        expect(rows[i].cells.length).toBe(2)
      }
    })
  })

  describe('removeTableColumn', () => {
    it('should remove the specified column', () => {
      const table = document.createElement('table')
      const tbody = document.createElement('tbody')
      const tr = document.createElement('tr')
      
      for (let i = 0; i < 3; i++) {
        const td = document.createElement('td')
        td.textContent = `Col ${i}`
        tr.appendChild(td)
      }
      
      tbody.appendChild(tr)
      table.appendChild(tbody)
      
      expect(tr.cells.length).toBe(3)
      
      removeTableColumn(table, 1)
      
      expect(tr.cells.length).toBe(2)
      expect(tr.cells[0].textContent).toBe('Col 0')
      expect(tr.cells[1].textContent).toBe('Col 2')
    })

    it('should not remove the last column', () => {
      const table = document.createElement('table')
      const tbody = document.createElement('tbody')
      const tr = document.createElement('tr')
      const td = document.createElement('td')
      
      tr.appendChild(td)
      tbody.appendChild(tr)
      table.appendChild(tbody)
      
      expect(tr.cells.length).toBe(1)
      
      removeTableColumn(table, 0)
      
      expect(tr.cells.length).toBe(1)
    })

    it('should remove column from header if exists', () => {
      const table = document.createElement('table')
      const thead = document.createElement('thead')
      const headerRow = document.createElement('tr')
      
      for (let i = 0; i < 3; i++) {
        const th = document.createElement('th')
        th.textContent = `Header ${i}`
        headerRow.appendChild(th)
      }
      
      thead.appendChild(headerRow)
      table.appendChild(thead)
      
      const tbody = document.createElement('tbody')
      const tr = document.createElement('tr')
      
      for (let i = 0; i < 3; i++) {
        const td = document.createElement('td')
        tr.appendChild(td)
      }
      
      tbody.appendChild(tr)
      table.appendChild(tbody)
      
      expect(headerRow.cells.length).toBe(3)
      expect(tr.cells.length).toBe(3)
      
      removeTableColumn(table, 1)
      
      expect(headerRow.cells.length).toBe(2)
      expect(tr.cells.length).toBe(2)
      expect(headerRow.cells[0].textContent).toBe('Header 0')
      expect(headerRow.cells[1].textContent).toBe('Header 2')
    })

    it('should remove column from all rows', () => {
      const table = document.createElement('table')
      const tbody = document.createElement('tbody')
      
      for (let i = 0; i < 3; i++) {
        const tr = document.createElement('tr')
        for (let j = 0; j < 3; j++) {
          const td = document.createElement('td')
          tr.appendChild(td)
        }
        tbody.appendChild(tr)
      }
      
      table.appendChild(tbody)
      
      removeTableColumn(table, 1)
      
      const rows = tbody.getElementsByTagName('tr')
      for (let i = 0; i < 3; i++) {
        expect(rows[i].cells.length).toBe(2)
      }
    })
  })

  describe('deleteTable', () => {
    it('should remove the table from the document', () => {
      const table = document.createElement('table')
      document.body.appendChild(table)
      
      expect(document.body.contains(table)).toBe(true)
      
      deleteTable(table)
      
      expect(document.body.contains(table)).toBe(false)
    })
  })
})
