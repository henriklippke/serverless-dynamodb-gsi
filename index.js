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
        const { resources: { Resources } } = this.serverless.service;
        
        if (Resources) {
          Object.values(Resources).forEach((resource) => {
            if (resource.Type === 'AWS::DynamoDB::Table') {
                const { TableName, GlobalSecondaryIndexes, AttributeDefinitions } = resource.Properties;
                this.gsiIndexes[TableName] = GlobalSecondaryIndexes;
                delete resource.Properties.GlobalSecondaryIndexes;
                GlobalSecondaryIndexes.forEach(({ KeySchema: [{ AttributeName }] }) => {
                    const index = AttributeDefinitions.findIndex(({ AttributeName: name }) => name === AttributeName);
                    if (index !== -1) {
                        AttributeDefinitions.splice(index, 1);
                    }
                });
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
