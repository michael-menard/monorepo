/**
 * AWS Cost Explorer API Client for User Metrics Cost Monitoring
 *
 * This module provides utilities for querying AWS Cost Explorer API to retrieve
 * cost data for User Metrics observability infrastructure. It supports various
 * cost breakdowns by tags (Component, Function, Environment) and time periods.
 *
 * @see docs/stories/1.4.cost-monitoring-budget-alerts.md for implementation details
 */

import {
  CostExplorerClient,
  GetCostAndUsageCommand,
  GetCostAndUsageCommandInput,
} from '@aws-sdk/client-cost-explorer'

/**
 * Cost Explorer client configured for us-east-1 (required for Cost Explorer API)
 */
const costExplorerClient = new CostExplorerClient({
  region: 'us-east-1', // Cost Explorer API only available in us-east-1
})

/**
 * Cost data structure returned by Cost Explorer API
 */
export interface CostData {
  timePeriod: {
    start: string
    end: string
  }
  total: {
    blendedCost: {
      amount: string
      unit: string
    }
  }
  groups?: Array<{
    keys: string[]
    metrics: {
      BlendedCost: {
        amount: string
        unit: string
      }
    }
  }>
}

/**
 * Query total cost for UserMetrics project within specified time period
 *
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @param granularity - Time granularity (DAILY, MONTHLY)
 * @returns Cost data for UserMetrics project
 */
export const getCostByProject = async (
  startDate: string,
  endDate: string,
  granularity: 'DAILY' | 'MONTHLY' = 'MONTHLY',
): Promise<CostData[]> => {
  const params: GetCostAndUsageCommandInput = {
    TimePeriod: {
      Start: startDate,
      End: endDate,
    },
    Granularity: granularity,
    Metrics: ['BlendedCost'],
    Filter: {
      Tags: {
        Key: 'Project',
        Values: ['UserMetrics'],
        MatchOptions: ['EQUALS'],
      },
    },
  }

  const command = new GetCostAndUsageCommand(params)
  const response = await costExplorerClient.send(command)

  return (
    response.ResultsByTime?.map(result => ({
      timePeriod: {
        start: result.TimePeriod?.Start || '',
        end: result.TimePeriod?.End || '',
      },
      total: {
        blendedCost: {
          amount: result.Total?.BlendedCost?.Amount || '0',
          unit: result.Total?.BlendedCost?.Unit || 'USD',
        },
      },
    })) || []
  )
}

/**
 * Query cost breakdown by Component tag (Umami, OpenReplay, Grafana, etc.)
 *
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @param granularity - Time granularity (DAILY, MONTHLY)
 * @returns Cost data grouped by Component tag
 */
export const getCostByComponent = async (
  startDate: string,
  endDate: string,
  granularity: 'DAILY' | 'MONTHLY' = 'MONTHLY',
): Promise<CostData[]> => {
  const params: GetCostAndUsageCommandInput = {
    TimePeriod: {
      Start: startDate,
      End: endDate,
    },
    Granularity: granularity,
    Metrics: ['BlendedCost'],
    GroupBy: [
      {
        Type: 'TAG',
        Key: 'Component',
      },
    ],
    Filter: {
      Tags: {
        Key: 'Project',
        Values: ['UserMetrics'],
        MatchOptions: ['EQUALS'],
      },
    },
  }

  const command = new GetCostAndUsageCommand(params)
  const response = await costExplorerClient.send(command)

  return (
    response.ResultsByTime?.map(result => ({
      timePeriod: {
        start: result.TimePeriod?.Start || '',
        end: result.TimePeriod?.End || '',
      },
      total: {
        blendedCost: {
          amount: result.Total?.BlendedCost?.Amount || '0',
          unit: result.Total?.BlendedCost?.Unit || 'USD',
        },
      },
      groups: result.Groups?.map(group => ({
        keys: group.Keys || [],
        metrics: {
          BlendedCost: {
            amount: group.Metrics?.BlendedCost?.Amount || '0',
            unit: group.Metrics?.BlendedCost?.Unit || 'USD',
          },
        },
      })),
    })) || []
  )
}

/**
 * Query cost breakdown by Function tag (SessionReplay, Analytics, Metrics, etc.)
 *
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @param granularity - Time granularity (DAILY, MONTHLY)
 * @returns Cost data grouped by Function tag
 */
export const getCostByFunction = async (
  startDate: string,
  endDate: string,
  granularity: 'DAILY' | 'MONTHLY' = 'MONTHLY',
): Promise<CostData[]> => {
  const params: GetCostAndUsageCommandInput = {
    TimePeriod: {
      Start: startDate,
      End: endDate,
    },
    Granularity: granularity,
    Metrics: ['BlendedCost'],
    GroupBy: [
      {
        Type: 'TAG',
        Key: 'Function',
      },
    ],
    Filter: {
      Tags: {
        Key: 'Project',
        Values: ['UserMetrics'],
        MatchOptions: ['EQUALS'],
      },
    },
  }

  const command = new GetCostAndUsageCommand(params)
  const response = await costExplorerClient.send(command)

  return (
    response.ResultsByTime?.map(result => ({
      timePeriod: {
        start: result.TimePeriod?.Start || '',
        end: result.TimePeriod?.End || '',
      },
      total: {
        blendedCost: {
          amount: result.Total?.BlendedCost?.Amount || '0',
          unit: result.Total?.BlendedCost?.Unit || 'USD',
        },
      },
      groups: result.Groups?.map(group => ({
        keys: group.Keys || [],
        metrics: {
          BlendedCost: {
            amount: group.Metrics?.BlendedCost?.Amount || '0',
            unit: group.Metrics?.BlendedCost?.Unit || 'USD',
          },
        },
      })),
    })) || []
  )
}
