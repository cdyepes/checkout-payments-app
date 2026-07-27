import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface GithubOidcStackProps extends cdk.StackProps {
  githubOrg: string;
  githubRepo: string;
  /** Default CDK bootstrap qualifier — matches `cdk bootstrap`'s default unless customized. */
  bootstrapQualifier?: string;
}

// Deployed once, by hand, with the user's own AWS credentials — this is the
// chicken-and-egg piece CI can never bootstrap itself: something has to create
// the OIDC trust relationship before GitHub Actions can assume anything.
export class GithubOidcStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: GithubOidcStackProps) {
    super(scope, id, props);

    const qualifier = props.bootstrapQualifier ?? 'hnb659fds';

    const provider = new iam.OpenIdConnectProvider(this, 'GithubOidcProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    });

    const deployRole = new iam.Role(this, 'GithubDeployRole', {
      roleName: 'github-actions-deploy',
      description: 'Assumed by GitHub Actions (OIDC) to deploy the checkout-payments-app CDK stacks',
      maxSessionDuration: cdk.Duration.hours(1),
      assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        },
        StringLike: {
          'token.actions.githubusercontent.com:sub': `repo:${props.githubOrg}/${props.githubRepo}:ref:refs/heads/main`,
        },
      }),
    });

    // No direct resource permissions here on purpose: `cdk bootstrap` already
    // provisioned privileged deploy/file-publishing/image-publishing/lookup
    // roles scoped to this account. The GitHub role only needs to assume
    // those — CDK's CLI does so automatically for any deploy it's not
    // already running as, so this one `sts:AssumeRole` grant is sufficient
    // for `cdk deploy` to do everything it needs (CloudFormation, S3/ECR
    // asset publishing, and whatever the stacks themselves provision).
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'AssumeCdkBootstrapRoles',
        actions: ['sts:AssumeRole'],
        resources: [
          `arn:aws:iam::${this.account}:role/cdk-${qualifier}-deploy-role-${this.account}-${this.region}`,
          `arn:aws:iam::${this.account}:role/cdk-${qualifier}-file-publishing-role-${this.account}-${this.region}`,
          `arn:aws:iam::${this.account}:role/cdk-${qualifier}-image-publishing-role-${this.account}-${this.region}`,
          `arn:aws:iam::${this.account}:role/cdk-${qualifier}-lookup-role-${this.account}-${this.region}`,
        ],
      }),
    );

    new cdk.CfnOutput(this, 'DeployRoleArn', {
      value: deployRole.roleArn,
      description: 'Paste this into the GitHub repo secret AWS_DEPLOY_ROLE_ARN',
    });
  }
}
