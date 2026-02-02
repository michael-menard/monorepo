import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import * as route53 from 'aws-cdk-lib/aws-route53'
import * as targets from 'aws-cdk-lib/aws-route53-targets'
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager'
import { Construct } from 'constructs'

export interface FrontendStackProps extends cdk.StackProps {
  environment: 'staging' | 'production'
  domainName?: string
}

export class FrontendStack extends cdk.Stack {
  public readonly distribution: cloudfront.Distribution
  public readonly bucket: s3.Bucket

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props)

    const { environment, domainName } = props

    // S3 Bucket for static assets (private, accessed via CloudFront OAI)
    this.bucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `lego-moc-frontend-${environment}-${this.account}`,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy:
        environment === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: environment !== 'production',
    })

    // Origin Access Identity for CloudFront
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: `OAI for ${environment} frontend`,
    })

    // Grant CloudFront access to S3 bucket
    this.bucket.grantRead(originAccessIdentity)

    // SSL Certificate (if custom domain)
    let certificate: certificatemanager.ICertificate | undefined
    if (domainName) {
      certificate = new certificatemanager.Certificate(this, 'Certificate', {
        domainName,
        validation: certificatemanager.CertificateValidation.fromDns(),
      })
    }

    // CloudFront Distribution
    // Note: API proxying removed - frontend will call APIs directly via their ALB URLs
    // This ensures no localhost fallbacks and cleaner separation of concerns
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(this.bucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      domainNames: domainName ? [domainName] : undefined,
      certificate,
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
      priceClass:
        environment === 'production'
          ? cloudfront.PriceClass.PRICE_CLASS_ALL
          : cloudfront.PriceClass.PRICE_CLASS_100,
    })

    // Route53 DNS (if custom domain)
    if (domainName) {
      const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
        domainName: domainName.split('.').slice(-2).join('.'), // Get root domain
      })

      new route53.ARecord(this, 'AliasRecord', {
        zone: hostedZone,
        recordName: domainName,
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution)),
      })
    }

    // Outputs
    new cdk.CfnOutput(this, 'BucketName', {
      value: this.bucket.bucketName,
      description: 'S3 bucket name for frontend assets',
    })

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID',
    })

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront distribution domain name',
    })

    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: domainName
        ? `https://${domainName}`
        : `https://${this.distribution.distributionDomainName}`,
      description: 'Website URL',
    })
  }
}
