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
        this.attributeDefinitions = [];
    }

    removeGSIsFromTemplate() {
        const { resources: { Resources } } = this.serverless.service;
        
        if (Resources) {
            for (const resource of Object.values(Resources)) {
                if (resource.Type === 'AWS::DynamoDB::Table') {
                    const { TableName, GlobalSecondaryIndexes, AttributeDefinitions } = resource.Properties;
                    this.gsiIndexes.push({ [TableName]: GlobalSecondaryIndexes });
                    delete resource.Properties.GlobalSecondaryIndexes;
                    for (const { KeySchema: [{ AttributeName }] } of GlobalSecondaryIndexes || []) {
                        const index = AttributeDefinitions.findIndex(({ AttributeName: name }) => name === AttributeName);
                        if (index !== -1) {
                            this.attributeDefinitions.push(AttributeDefinitions.splice(index, 1)[0]);
                        }
                    }
                }
            }
        }
    }
    
    async createGSIs() {
        const region = this.options.region;
        const dynamoDb = new AWS.DynamoDB({ region });
        for (const [index, obj] of Object.entries(this.gsiIndexes)) {
            const tableName = Object.keys(obj)[0];
            const gsis = Object.values(obj)[0];
            for (const gsi of gsis) {
                const params = {
                    TableName: tableName,
                    GlobalSecondaryIndexUpdates: [
                        {
                            Create: gsi,
                        },
                    ],
                    AttributeDefinitions: this.attributeDefinitions,
                };
                await dynamoDb.updateTable(params).promise();
            }
        }
    }
}

module.exports = DynamoDBGSIPlugin;
