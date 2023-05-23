'use strict';

const AWS = require('aws-sdk');

class DynamoDBGSIPlugin {
    constructor(serverless, options) {
        this.serverless = serverless;
        this.options = options;
        this.provider = this.serverless.getProvider('aws');

        this.hooks = {
            'before:package:createDeploymentArtifacts': this.removeGSIsFromTemplate.bind(this),
            'after:deploy:deploy': this.createGSIs.bind(this),
        };

        this.gsiIndexes = [];
    }

    removeGSIsFromTemplate() {
        const service = this.serverless.service;

        if (service.resources && service.resources.Resources) {
            Object.keys(service.resources.Resources).forEach((resourceName) => {
                const resource = service.resources.Resources[resourceName];
                if (resource.Type === 'AWS::DynamoDB::Table') {
                    if (resource.Properties.GlobalSecondaryIndexes) {
                        this.gsiIndexes[resource.Properties.TableName] = resource.Properties.GlobalSecondaryIndexes;
                        delete resource.Properties.GlobalSecondaryIndexes;
                    }
                }
            });
        }
    }

    createGSIs() {
        const region = this.options.region;
        const dynamoDb = new AWS.DynamoDB({ region });
        for (const [tableName, gsis] of this.gsiIndexes) {
            for (const gsi of gsis) {
                const params = {
                    TableName: tableName,
                    GlobalSecondaryIndexUpdates: [
                        {
                            Create: gsi,
                        },
                    ],
                };
                await dynamoDb.updateTable(params).promise();
            }
        }
    }
}

module.exports = DynamoDBGSIPlugin;


/// Compare 
//bitte schreibe mir eine javascript function die per sdk alle dynamoDB gsi holt und überprüft ob diese mit den per cloudformation definierten GSIs übereinstimmt.

async function checkDynamoDBGSIs(dynamoDb, cloudFormationGsis) {
    const tableName = "your-table-name";
  
    // Get the current GSIs for the DynamoDB table
    const result = await dynamoDb.describeTable({ TableName: tableName }).promise();
    const dynamoDbGsis = result.Table.GlobalSecondaryIndexes;
  
    // Check if the GSIs in CloudFormation match the ones in DynamoDB
    let isMatch = true;
    if (dynamoDbGsis.length !== cloudFormationGsis.length) {
      isMatch = false;
    } else {
      for (let i = 0; i < dynamoDbGsis.length; i++) {
        const dynamoDbGsi = dynamoDbGsis[i];
        const cloudFormationGsi = cloudFormationGsis[i];
        if (dynamoDbGsi.IndexName !== cloudFormationGsi.IndexName ||
            dynamoDbGsi.KeySchema.length !== cloudFormationGsi.KeySchema.length ||
            dynamoDbGsi.Projection.ProjectionType !== cloudFormationGsi.ProjectionType) {
          isMatch = false;
          break;
        }
        for (let j = 0; j < dynamoDbGsi.KeySchema.length; j++) {
          const dynamoDbKeySchema = dynamoDbGsi.KeySchema[j];
          const cloudFormationKeySchema = cloudFormationGsi.KeySchema[j];
          if (dynamoDbKeySchema.AttributeName !== cloudFormationKeySchema.AttributeName ||
              dynamoDbKeySchema.KeyType !== cloudFormationKeySchema.KeyType) {
            isMatch = false;
            break;
          }
        }
      }
    }
  
    return isMatch;
  }
