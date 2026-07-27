import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'node:path';

export interface ApiStackProps extends cdk.StackProps {
  corsOrigin: string;
  databaseUrl: string;
  paymentsApiUrl: string;
  paymentsPublicKey: string;
  paymentsPrivateKey: string;
  paymentsIntegrityKey: string;
  paymentsEventsKey: string;
}

export class ApiStack extends cdk.Stack {
  public readonly functionUrl: lambda.FunctionUrl;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // Matches the "rhel-openssl-3.0.x" binaryTarget in schema.prisma — that
    // engine is built for x86_64, so the function must run on x86_64 too.
    const fn = new lambda.DockerImageFunction(this, 'ApiFunction', {
      architecture: lambda.Architecture.X86_64,
      code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, '../../'), {
        file: 'apps/api/Dockerfile',
      }),
      memorySize: 512,
      timeout: cdk.Duration.seconds(15),
      environment: {
        NODE_ENV: 'production',
        PORT: '3000',
        DATABASE_URL: props.databaseUrl,
        CORS_ORIGIN: props.corsOrigin,
        PAYMENTS_API_URL: props.paymentsApiUrl,
        PAYMENTS_PUBLIC_KEY: props.paymentsPublicKey,
        PAYMENTS_PRIVATE_KEY: props.paymentsPrivateKey,
        PAYMENTS_INTEGRITY_KEY: props.paymentsIntegrityKey,
        PAYMENTS_EVENTS_KEY: props.paymentsEventsKey,
      },
    });

    // CORS is handled by the NestJS app itself (app.enableCors, driven by the
    // CORS_ORIGIN env var above) — leaving it off here too would mean two
    // layers answering preflight requests, which can produce duplicate
    // Access-Control-Allow-Origin headers that browsers reject.
    this.functionUrl = fn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    new cdk.CfnOutput(this, 'ApiUrl', { value: this.functionUrl.url });
  }
}
