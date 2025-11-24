import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const DASHBOARD_DIR = path.join(__dirname, '../grafana-dashboards')

describe('Grafana Dashboard Validation', () => {
  const dashboardFiles = fs.readdirSync(DASHBOARD_DIR)
    .filter(file => file.endsWith('.json') && !file.includes('folder-structure') && !file.includes('dashboard-settings'))

  describe('JSON Syntax Validation', () => {
    dashboardFiles.forEach(file => {
      it(`should have valid JSON syntax: ${file}`, () => {
        const filePath = path.join(DASHBOARD_DIR, file)
        const content = fs.readFileSync(filePath, 'utf8')
        
        expect(() => JSON.parse(content)).not.toThrow()
      })
    })
  })

  describe('Required Dashboard Properties', () => {
    dashboardFiles.forEach(file => {
      it(`should have required properties: ${file}`, () => {
        const filePath = path.join(DASHBOARD_DIR, file)
        const content = fs.readFileSync(filePath, 'utf8')
        const dashboard = JSON.parse(content)

        expect(dashboard.dashboard).toBeDefined()
        expect(dashboard.dashboard.uid).toBeDefined()
        expect(dashboard.dashboard.title).toBeDefined()
        expect(dashboard.dashboard.folderUid).toBeDefined()
        expect(dashboard.dashboard.tags).toBeDefined()
        expect(Array.isArray(dashboard.dashboard.tags)).toBe(true)
      })
    })
  })

  describe('Folder Mapping Validation', () => {
    const validFolderUids = ['application-folder', 'infrastructure-folder', 'frontend-folder']

    dashboardFiles.forEach(file => {
      it(`should have valid folderUid: ${file}`, () => {
        const filePath = path.join(DASHBOARD_DIR, file)
        const content = fs.readFileSync(filePath, 'utf8')
        const dashboard = JSON.parse(content)

        expect(validFolderUids).toContain(dashboard.dashboard.folderUid)
      })
    })
  })

  describe('Time Range Configuration', () => {
    dashboardFiles.forEach(file => {
      it(`should have valid time range: ${file}`, () => {
        const filePath = path.join(DASHBOARD_DIR, file)
        const content = fs.readFileSync(filePath, 'utf8')
        const dashboard = JSON.parse(content)

        expect(dashboard.dashboard.time).toBeDefined()
        expect(dashboard.dashboard.time.from).toBeDefined()
        expect(dashboard.dashboard.time.to).toBeDefined()
        expect(dashboard.dashboard.time.from).toMatch(/^now-\d+[hmd]$/)
        expect(dashboard.dashboard.time.to).toBe('now')
      })
    })
  })

  describe('Refresh Interval Configuration', () => {
    const validRefreshIntervals = ['30s', '1m', '2m', '5m', '10m']

    dashboardFiles.forEach(file => {
      it(`should have valid refresh interval: ${file}`, () => {
        const filePath = path.join(DASHBOARD_DIR, file)
        const content = fs.readFileSync(filePath, 'utf8')
        const dashboard = JSON.parse(content)

        expect(dashboard.dashboard.refresh).toBeDefined()
        expect(validRefreshIntervals).toContain(dashboard.dashboard.refresh)
      })
    })
  })

  describe('Panel Configuration', () => {
    dashboardFiles.forEach(file => {
      it(`should have valid panels: ${file}`, () => {
        const filePath = path.join(DASHBOARD_DIR, file)
        const content = fs.readFileSync(filePath, 'utf8')
        const dashboard = JSON.parse(content)

        expect(dashboard.dashboard.panels).toBeDefined()
        expect(Array.isArray(dashboard.dashboard.panels)).toBe(true)
        expect(dashboard.dashboard.panels.length).toBeGreaterThan(0)

        dashboard.dashboard.panels.forEach((panel: any, index: number) => {
          expect(panel.id, `Panel ${index} should have id`).toBeDefined()
          expect(panel.title, `Panel ${index} should have title`).toBeDefined()
          expect(panel.type, `Panel ${index} should have type`).toBeDefined()
          expect(panel.gridPos, `Panel ${index} should have gridPos`).toBeDefined()
        })
      })
    })
  })

  describe('Variable Configuration', () => {
    dashboardFiles.forEach(file => {
      it(`should have valid templating variables: ${file}`, () => {
        const filePath = path.join(DASHBOARD_DIR, file)
        const content = fs.readFileSync(filePath, 'utf8')
        const dashboard = JSON.parse(content)

        if (dashboard.dashboard.templating && dashboard.dashboard.templating.list) {
          dashboard.dashboard.templating.list.forEach((variable: any, index: number) => {
            expect(variable.name, `Variable ${index} should have name`).toBeDefined()
            expect(variable.type, `Variable ${index} should have type`).toBeDefined()
            
            if (variable.type === 'custom') {
              expect(variable.options, `Custom variable ${index} should have options`).toBeDefined()
              expect(Array.isArray(variable.options)).toBe(true)
            }
          })
        }
      })
    })
  })
})

describe('Folder Structure Validation', () => {
  it('should have valid folder structure configuration', () => {
    const folderStructurePath = path.join(DASHBOARD_DIR, 'folder-structure.json')
    expect(fs.existsSync(folderStructurePath)).toBe(true)

    const content = fs.readFileSync(folderStructurePath, 'utf8')
    const folderStructure = JSON.parse(content)

    expect(folderStructure.folders).toBeDefined()
    expect(Array.isArray(folderStructure.folders)).toBe(true)
    expect(folderStructure.folders).toHaveLength(3)

    const expectedFolders = ['Infrastructure', 'Application', 'Frontend']
    const expectedUids = ['infrastructure-folder', 'application-folder', 'frontend-folder']

    folderStructure.folders.forEach((folder: any, index: number) => {
      expect(folder.title).toBeDefined()
      expect(folder.uid).toBeDefined()
      expect(expectedFolders).toContain(folder.title)
      expect(expectedUids).toContain(folder.uid)
    })
  })
})

describe('Dashboard Settings Validation', () => {
  it('should have valid dashboard settings configuration', () => {
    const settingsPath = path.join(DASHBOARD_DIR, 'dashboard-settings.json')
    expect(fs.existsSync(settingsPath)).toBe(true)

    const content = fs.readFileSync(settingsPath, 'utf8')
    const settings = JSON.parse(content)

    expect(settings.dashboardSettings).toBeDefined()
    expect(settings.dashboardSettings.refreshIntervals).toBeDefined()
    expect(settings.dashboardSettings.timeRanges).toBeDefined()
    expect(settings.dashboardSettings.alertThresholds).toBeDefined()
    expect(settings.cloudWatchApiOptimization).toBeDefined()
  })
})
