import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../_primitives/tabs'

export interface TabItem {
  id: string
  label: string
  content: React.ReactNode
  disabled?: boolean
}

export interface TabPanelProps {
  tabs: Array<TabItem>
  defaultTab?: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  tabsListClassName?: string
  tabsContentClassName?: string
}

export const TabPanel: React.FC<TabPanelProps> = ({
  tabs,
  defaultTab,
  value,
  onValueChange,
  className = '',
  tabsListClassName = '',
  tabsContentClassName = '',
}) => {
  return (
    <Tabs
      defaultValue={defaultTab || tabs[0]?.id}
      value={value}
      onValueChange={onValueChange}
      className={className}
    >
      <TabsList className={tabsListClassName}>
        {tabs.map(tab => (
          <TabsTrigger key={tab.id} value={tab.id} disabled={tab.disabled}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map(tab => (
        <TabsContent key={tab.id} value={tab.id} className={tabsContentClassName}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}
