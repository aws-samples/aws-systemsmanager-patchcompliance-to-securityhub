var AWS = require('aws-sdk');
AWS.config.update({ region: process.env.AWS_REGION });

var ssm = new AWS.SSM();
var s3 = new AWS.S3();
var securityhub = new AWS.SecurityHub();
var sts = new AWS.STS();

var listItemsParams = {
    Filters: [
        {
            "Key": "AWS:ComplianceItem.Status",
            "Values": ["NON_COMPLIANT"],
            "Type": "Equal"
        },
        {
            "Key": "AWS:ComplianceItem.ComplianceType",
            "Values": ["Patch"],
            "Type": "Equal"
        },
        {
            "Key": "AWS:ComplianceItem.Severity",
            "Values": ["CRITICAL"],
            "Type": "Equal"
        }
    ],
    ResourceTypes: [
        "ManagedInstance"
    ],
    ResourceIds: [
        "InstanceID"
    ]
}
var complianceResourceSummaryParams = {
    Filters: [
        {
            Key: "AWS:ComplianceSummary.Status",
            Values: ["NON_COMPLIANT"],
            Type: "Equal"
        },
        {
            Key: "AWS:ComplianceSummary.ComplianceType",
            Values: ["Patch"],
            Type: "Equal"
        }
    ]
}
function systemManagerSyncSecurityHub(resolve, reject) {
    ssm.listResourceComplianceSummaries(complianceResourceSummaryParams, function (err, complianceSummary) {
        if (err) {
            console.log(err);
            reject(err);
            return;
        }

        if (complianceSummary.ResourceComplianceSummaryItems[0] != undefined) {
            var resources = [];
            complianceSummary.ResourceComplianceSummaryItems.forEach(function (singleComplianceItem) {
                if (singleComplianceItem.ResourceType && 'ManagedInstance' === (singleComplianceItem.ResourceType)) {
                    resources.push(singleComplianceItem.ResourceId);
                }
            });

            listItemsParams.ResourceIds = resources;

            ssm.listComplianceItems(listItemsParams, function (err, complianceItems) {
                if (err) {
                    console.log(err, err.stack);
                    reject(err);
                }

                sts.getCallerIdentity({}, function (err, stsData) {
                    if (err) {
                        console.log(err);
                        reject(err);
                        return;
                    }
                    var missingPatches = getMissingPatches(complianceItems);

                    var findings = [];
                    Object.values(missingPatches).forEach(function (singleComplianceItemFinding) {
                        findings.push(getSingleComplianceItemFinding(singleComplianceItemFinding, stsData));
                    });
                    console.log(JSON.stringify(findings));

                    securityhub.batchImportFindings({
                        'Findings': findings
                    }, function (err, secHubData) {
                        if (err) {
                            reject(err);
                            return;
                        }
                        else {
                            resolve(secHubData);
                        }
                    });

                });

            });
        } else {
            console.log("There is no instance with missing patches and compliance severity set as critical")
            return;
        }
    });
}
var getSingleComplianceItemFinding = function (missingPatch, stsData) {
    return {
        AwsAccountId: stsData.Account,
        CreatedAt: new Date().toISOString(),
        Description: 'A critical patch is missing in some of the instances. Check further details in Systems Manager Compliance \n Patch Title: ' + missingPatch.Title + '\n Patch Id: ' + missingPatch.Id,
        GeneratorId: 'SSM',
        Id: missingPatch.Title,
        ProductArn: 'arn:aws:securityhub:' + process.env.AWS_REGION + ':' + stsData.Account + ':product/' + stsData.Account + '/default',
        Resources: missingPatch.resources,
        SchemaVersion: "2018-10-08",
        Severity: { /* required */
            Normalized: '70' // TODO
        },
        Title: 'Critical Patch with title ' + missingPatch.Title + ' missing',
        UpdatedAt: new Date().toISOString(), /* required */
        Compliance: {
            Status: 'FAILED'
        },
        Types: [
            'PATCH'
        ],
    }
}

function getMissingPatches(complianceItems, Title, map) {
    var missingPatches = {};
    complianceItems['ComplianceItems'].forEach(function (complianceItem) {
        console.log(complianceItem);
        if (!complianceItem.Title) {
            return;
        }
        if (!missingPatches.hasOwnProperty(complianceItem.Title)) {
            missingPatches[complianceItem.Title] = {
                resources: []
            };
        }
        missingPatches[complianceItem.Title].resources.push({
            Id: complianceItem.ResourceId,
            Type: 'AwsEc2Instance'
        });
        missingPatches[complianceItem.Title].Title = complianceItem.Title;
        missingPatches[complianceItem.Title].Id = complianceItem.Id;
    });
    return missingPatches;
}

exports.handler = async (event) => {
    var InstanceID = event.instnaceid
    console.log(InstanceID)
    return new Promise(systemManagerSyncSecurityHub);
}
