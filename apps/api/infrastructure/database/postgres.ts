/**
 * PostgreSQL Database Infrastructure
 * 
 * Creates RDS PostgreSQL Database with:
 * - PostgreSQL 15.x
 * - Deployed in private subnets for security
 * - Automated backups with 7-day retention
 * - Sized appropriately per environment
 */

export function createPostgres(vpc: any, rdsSecurityGroup: any, stage: string) {
  const postgres = new sst.aws.Postgres('LegoApiPostgres', {
    vpc,
    version: '15.8',
    instance: stage === 'production' ? 'r6g.large' : 't4g.micro',
    scaling: {
      min: stage === 'production' ? '1 ACU' : '0.5 ACU',
      max: stage === 'production' ? '16 ACU' : '2 ACU',
    },
    transform: {
      instance: args => {
        args.securityGroupIds = [rdsSecurityGroup.id]
      },
    },
  })

  return { postgres }
}
