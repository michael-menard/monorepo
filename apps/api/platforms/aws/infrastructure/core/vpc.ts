/**
 * VPC Infrastructure for LEGO API Serverless
 *
 * Creates VPC with public/private subnets across 2 Availability Zones
 * - /24 CIDR block (10.0.0.0/24) for 256 IP addresses
 * - Public subnets: /27 (32 IPs each) for NAT Gateway and ALB
 * - Private subnets: /26 (64 IPs each) for ECS, Lambda, RDS, OpenSearch
 * - Single NAT Gateway for cost optimization ($32/month vs $64/month)
 */

export function createVpc(stage: string, createResourceTags: Function) {
  const vpc = new sst.aws.Vpc('LegoApiVpc', {
    cidr: '10.0.0.0/24', // /24 CIDR block as required by Story 1.1
    az: 2, // Two Availability Zones for high availability
    nat: { type: 'managed' }, // Single NAT Gateway for cost optimization
    transform: {
      vpc: args => {
        // Apply UserMetrics observability tags
        args.tags = {
          ...createResourceTags(stage, 'networking', 'engineering@example.com'),
          Name: `user-metrics-vpc-${stage}`,
        }
      },
      publicSubnet: (args, info) => {
        args.cidrBlock = info.index === 0 ? '10.0.0.0/27' : '10.0.0.32/27' // /27 subnets (32 IPs each)
        args.tags = {
          ...createResourceTags(stage, 'networking', 'engineering@example.com'),
          Name: `user-metrics-public-subnet-${info.index + 1}-${stage}`,
          SubnetType: 'PublicSubnet',
        }
      },
      privateSubnet: (args, info) => {
        args.cidrBlock = info.index === 0 ? '10.0.0.64/26' : '10.0.0.128/26' // /26 subnets (64 IPs each)
        args.tags = {
          ...createResourceTags(stage, 'networking', 'engineering@example.com'),
          Name: `user-metrics-private-subnet-${info.index + 1}-${stage}`,
          SubnetType: 'PrivateSubnet',
        }
      },
      natGateway: args => {
        args.tags = {
          ...createResourceTags(stage, 'networking', 'engineering@example.com'),
          Name: `user-metrics-nat-gateway-${stage}`,
          Purpose: 'InternetAccess',
        }
      },
      internetGateway: args => {
        args.tags = {
          ...createResourceTags(stage, 'networking', 'engineering@example.com'),
          Name: `user-metrics-internet-gateway-${stage}`,
          Purpose: 'InternetAccess',
        }
      },
    },
  })

  return { vpc }
}
