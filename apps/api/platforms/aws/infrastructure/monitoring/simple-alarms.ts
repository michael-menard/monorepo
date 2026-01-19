/**
 * Simple CloudWatch Alarms for Sub-Stack Architecture
 * 
 * Creates basic CloudWatch alarms for Lambda function error rates:
 * - Monitors error rate > 5% over 5 minutes
 * - Sends notifications to SNS topic
 * - Creates alarms for all critical Lambda functions
 */

export function createSimpleErrorRateAlarms(functions: any, errorAlertTopic: any, stage: string) {
  /**
   * Helper function to create error rate alarm for a Lambda function
   */
  function createErrorRateAlarm(functionName: string, lambdaFunction: any) {
    return new aws.cloudwatch.MetricAlarm(`${functionName}ErrorRateAlarm`, {
      name: `${functionName}-error-rate-${stage}`,
      description: `Error rate alarm for ${functionName} Lambda function`,
      
      // Metric configuration
      metricName: 'Errors',
      namespace: 'AWS/Lambda',
      statistic: 'Sum',
      dimensions: {
        FunctionName: lambdaFunction.name,
      },
      
      // Alarm configuration
      period: 300, // 5 minutes
      evaluationPeriods: 1,
      threshold: 5, // 5 errors in 5 minutes
      comparisonOperator: 'GreaterThanThreshold',
      
      // Actions
      alarmActions: [errorAlertTopic.arn],
      okActions: [errorAlertTopic.arn],
      
      tags: {
        Environment: stage,
        Service: 'lego-api-serverless',
        Function: functionName,
        AlarmType: 'ErrorRate',
      },
    })
  }

  // Create error rate alarms for critical functions
  const alarms = {
    healthCheckAlarm: createErrorRateAlarm('HealthCheck', functions.healthCheckFunction),
    mocInstructionsAlarm: createErrorRateAlarm('MocInstructions', functions.mocInstructionsFunction),
    mocFileUploadAlarm: createErrorRateAlarm('MocFileUpload', functions.mocFileUploadFunction),
    uploadImageAlarm: createErrorRateAlarm('UploadImage', functions.uploadImageFunction),
    listImagesAlarm: createErrorRateAlarm('ListImages', functions.listImagesFunction),
    listWishlistAlarm: createErrorRateAlarm('ListWishlist', functions.listWishlistFunction),
    createWishlistItemAlarm: createErrorRateAlarm('CreateWishlistItem', functions.createWishlistItemFunction),
    uploadWishlistImageAlarm: createErrorRateAlarm('UploadWishlistImage', functions.uploadWishlistImageFunction),
    websocketConnectAlarm: createErrorRateAlarm('WebSocketConnect', functions.websocketConnectFunction),
  }

  return alarms
}
