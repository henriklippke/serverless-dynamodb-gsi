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
