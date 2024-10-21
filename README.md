# Reporting AWS Systems Manager patch compliance data to AWS Security Hub for multiple accounts under AWS Organizations

CloudFormation template and index.js related to [Multi-Account patch compliance with Patch Manager and Security Hub](https://aws.amazon.com/blogs/mt/multi-account-patch-compliance-with-patch-manager-and-security-hub/) blog post published on the [AWS Management & Governance Blog](https://aws.amazon.com/blogs/mt/). 

**Note**: Since 10/2020, viewing patch compliance findings across AWS accounts in AWS Security Hub is supported natively. For more information please see What’s new announcement titled [View patch compliance findings across AWS accounts in AWS Security Hub](https://aws.amazon.com/about-aws/whats-new/2020/09/view-patch-compliance-findings-aws-accounts-aws-security-hub/).

## Overview
This is a sample solution to import critical patch compliance findings into [AWS Security Hub](https://aws.amazon.com/security-hub/). Additionally, you can view aggregated patch compliance data across accounts by aggregating Security Hub findings across accounts. The solution will create a Maintenance Window with two tasks
1. Run [AWS-RunPatchBaselin](https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-about-aws-runpatchbaseline.html) in scan mode to report the patch results to compliance.
2. Run Lambda function to pull the non-compliance patch information for each instance from Compliance and report it to AWS Security Hub.

Here is the overview of the setup

![alt text](https://github.com/aws-samples/aws-systemsmanager-patchcompliance-to-securityhub/blob/master/overview.png)

## Deployment
### Prerequisites
-	[Patch Baseline](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-patch-baseline-console.html) with **Compliance level** set to **critical**
- Build Lambda deployment package based on [index.js](https://github.com/aws-samples/aws-systemsmanager-patchcompliance-to-securityhub/blob/master/index.js) following the guide [here](https://aws.amazon.com/premiumsupport/knowledge-center/lambda-deployment-package-nodejs/). Please note the aws-sdk is the only package needed for the deployment package. You can also find more information about the folder structure by following this link [here](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-package.html#nodejs-package-dependencies). Upload the package to S3 bucket.

### Walkthrough

[Import-To-Sec-Hub.json](https://github.com/aws-samples/aws-systemsmanager-patchcompliance-to-securityhub/blob/master/Import-To-Sec-Hub.json) will go through the following steps:
1.	Setup IAM rules and Permissions
2.	Setup Lambda 
3.	Setup Maintenance Windows 
4.	Setup Cross Account Sync in Security Hub

For more details about launching a stack, refer to [Creating a Stack on the AWS CloudFormation Console](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-console-create-stack.html).

### Template Parameters
The stack template includes the following parameters:

| Parameter | Required | Description |
| --- | --- | --- |
| ExistingLambdaExecutionRole | No | The role should has list permissions on SSM compliance and Import permission in security hub. This parameter is **optional**, if no role is provided, the template creates a new role and policy in the account with the permissions listed under the Do It Yourself section in the [blog](). |
| S3BucketParam | Yes | S3 bucket of the Lambda deployment package. |
| S3KeyParam | Yes | S3 key of the Lambda deployment package. |
| TargetTagKey  | Yes | The tag key of instances that would be targets of maintenance window created. |
| TargetTagValue | Yes | The tag value of instances that would be targets of maintenance window created. |

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
